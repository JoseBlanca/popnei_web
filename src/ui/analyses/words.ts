/**
 * The words of the frame every analysis panel shares
 * (docs/specs/analyses/diversity.md, "The panel", its states and its
 * words): the line of a calculation under way, the words of a result
 * removed and of a calculation stopped, written from the change that
 * caused them, the count of the warnings, a
 * failure that is not popnei's refusal, and the line of the versions
 * beside a result; and what several panels share: the populations of a
 * ready state, those the filters leave empty and the wait for the
 * statistics of each individual, and the refusals of a number field,
 * the minimum of individuals of the distances between populations and
 * the diversity, and the fields of the Variants step. Pure, so that a
 * test in node checks them; `AnalysisPanel.tsx`, `Failed.tsx`, the
 * panels and the Variants step draw them.
 */

import {
  counted,
  escaped,
  grouped,
  loosenText,
  namesOf,
  saying,
} from "../../core/project.ts";
import type { Notice } from "../../core/store.ts";
import type { Pops, Progress, RunError } from "../../worker/protocol.ts";
import { capitalized, undoneOrRedone } from "../sentences.ts";
import { numberText } from "../widgets/committedNumber.ts";
import type { NumberRefusal } from "../widgets/committedNumber.ts";

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
    thresholds of the individuals need · 35% · 0:12", and the same for
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
 * diversity", and `resultName` its result, "the table"; `plural` for an
 * analysis and a result named in the plural, "The principal components
 * were removed …; Undo brings back the plot and the table as they were,
 * …; Run calculates new ones …" (docs/specs/analyses/pca.md, "Its
 * words").
 */
export function removedText(
  name: string,
  resultName: string,
  notice: Notice,
  plural = false,
): string {
  const cause = notice.cause;
  const start = undoneOrRedone(cause);
  const was = plural ? "were" : "was";
  const it = plural ? "they were" : "it was";
  const one = plural ? "new ones" : "a new one";
  const back = `brings back ${resultName} as ${it}, with no calculation`;
  if (start === null) {
    return `${capitalized(name)} ${was} removed because ${cause.description}. Undo ${back}; Run calculates ${one} for the new settings.`;
  }
  const action = cause.kind === "undo" ? "Redo" : "Undo";
  return `${start}. ${capitalized(name)} ${was} removed; ${action} ${back}, and Run calculates ${one} for the settings as they are now.`;
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

/** The populations a run will take, with their sizes, the noun with
    each: "3 populations: p0, 48 individuals; p2, 84 individuals; p1, 68
    individuals". The ready state of the diversity and of the distances
    between populations. */
export function populationsText(pops: Pops): string {
  const parts = pops.map(
    ([pop, members]) =>
      `${escaped(pop)}, ${counted(members.length, "individual")}`,
  );
  return `${counted(pops.length, "population")}: ${parts.join("; ")}`;
}

/** The line of the ready state while a threshold on the individuals waits
    for the statistics of each individual, which a Run calculates first:
    the diversity's, the distances' and the principal components'. */
export const WAITS_FOR_STATISTICS_TEXT =
  "Run calculates the statistics of each individual first, and the populations may lose individuals to the thresholds.";

/** The populations the filters of individuals leave with no individual,
    which a run leaves out, and what to do, since the panels are in the
    Analyses step: "p9 has no individual left after the filters of
    individuals, and is left out. Loosen the filters of individuals in
    the Variants step to keep it."; "p1 and p2 have …, and are left out.
    Loosen … to keep them.". */
export function emptiedText(emptied: readonly string[]): string {
  const one = emptied.length === 1;
  return `${namesOf(emptied)} ${one ? "has" : "have"} no individual left after the filters of individuals, and ${one ? "is" : "are"} left out. ${loosenText(one)}`;
}

/** The number of decimals in words, as a refusal says it. */
const DECIMAL_WORDS = ["no", "one", "two", "three", "four"] as const;

/** What a number field says of a character typed that it threw away. */
export interface NotTakenWords {
  /** The line of a comma, before the value kept. */
  readonly comma: string;
  /** What follows the character named, before the value kept. */
  readonly other: string;
}

/** The characters a number of the fields is written with. */
const NUMBER_CHARACTER = /^[0-9.]$/;

/** The line of the text `text` a field threw away: the comma's, when
    there is one in it, otherwise the first character that is not a
    digit or a point, or the first of all, named. */
function notTakenWhy(text: string, words: NotTakenWords): string {
  if (text.includes(",")) return words.comma;
  const characters = Array.from(text);
  const named =
    characters.find((character) => !NUMBER_CHARACTER.test(character)) ??
    characters[0] ??
    "";
  const name =
    named === " " || named === "\u00a0" ? "A space" : `‘${escaped(named)}’`;
  return `${name} ${words.other}`;
}

/** Why a number was refused: "10 is more than 1", "0.125 has more than
    two decimals", "2.5 is not a whole number", or the words of a
    character thrown away, `notTaken` of the field. The numbers are as
    the field shows them and as they were typed, or, given `written`,
    the bounds and a whole number typed are written by it, with commas
    between thousands for a count. The number fields of the Variants step
    and of the panels. */
export function refusedWhy(
  refusal: NumberRefusal,
  notTaken: NotTakenWords,
  written?: (value: number) => string,
): string {
  const bound = written ?? numberText;
  const typed = (text: string): string =>
    written === undefined ? text : typedWritten(text, written);
  switch (refusal.kind) {
    case "aboveMax":
      return `${typed(refusal.typed)} is more than ${bound(refusal.maxValue)}`;
    case "belowMin":
      return `${typed(refusal.typed)} is less than ${bound(refusal.minValue)}`;
    case "offStep": {
      const text = refusal.typed;
      if (refusal.decimals === 0) return `${text} is not a whole number`;
      const count = DECIMAL_WORDS[refusal.decimals] ?? String(refusal.decimals);
      const noun = refusal.decimals === 1 ? "decimal" : "decimals";
      return `${text} has more than ${count} ${noun}`;
    }
    case "notTaken":
      return notTakenWhy(refusal.text, notTaken);
  }
}

/** A number typed as a refusal names it: a whole number written by
    `written`, anything else as it was typed. */
function typedWritten(
  typed: string,
  written: (value: number) => string,
): string {
  return /^\d+$/.test(typed) ? written(Number(typed)) : typed;
}

/** What the minimum number of individuals of an analysis says of a
    character it threw away: the field of the distances between
    populations, and the diversity's when it has one
    (docs/specs/analyses/diversity.md, "What it shows"). */
const MINIMUM_NOT_TAKEN: NotTakenWords = Object.freeze({
  comma: "Write the minimum as a whole number, 20 and not 20,0",
  other: "cannot be typed in the minimum, which is a whole number, as 20",
});

/** The line under the minimum number of individuals of an analysis for
    a number it refused, or a character it threw away, with the minimum
    kept, its whole numbers with commas between thousands: "2.5 is not a
    whole number; the minimum stays 20.", "5,000,000,000 is more than
    4,294,967,295; the minimum stays 20.", "Write the minimum as a whole
    number, 20 and not 20,0; the minimum stays 20." */
export function minimumRefusedText(
  refusal: NumberRefusal,
  kept: number,
): string {
  return `${refusedWhy(refusal, MINIMUM_NOT_TAKEN, grouped)}; the minimum stays ${grouped(kept)}.`;
}
