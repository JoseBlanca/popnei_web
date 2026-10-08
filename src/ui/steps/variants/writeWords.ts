/**
 * The words of the part of the Variants step that writes the filtered
 * variants as a `.nei` file (docs/specs/analyses/writeVariants.md, "The
 * step's part", its states and "Its words"): the button, the size
 * expected and its warning, the line of a write under way, the Save
 * button, and what the part says once the file is saved, dropped,
 * written with no variant, or not written. Pure, so that a test in node
 * checks them; `WriteSection.tsx` draws them.
 */

import { variantsOfFile } from "../../../core/analyses/filterCounts.ts";
import { statisticsFailedWords } from "../../../core/analyses/individualChecks.ts";
import {
  emptySourceText,
  otherPloidyText,
} from "../../../core/analyses/words.ts";
import { writtenName } from "../../../core/fileNames.ts";
import { counted, escaped } from "../../../core/project.ts";
import type { Project } from "../../../core/project.ts";
import type { AnalysisError } from "../../../core/store.ts";
import { sizeText } from "../../../core/writeEstimate.ts";
import type { WriteEstimate } from "../../../core/writeEstimate.ts";
import type { PassStats } from "../../../worker/protocol.ts";
import {
  clockText,
  failureText,
  STATISTICS_BAR_LABEL,
  STATISTICS_WORDS,
} from "../../analyses/words.ts";
import { capitalized } from "../../sentences.ts";
import { withoutTheStep } from "./words.ts";

/** The heading of the part, and its title in the notice and the status
    region is "Writing the file" (docs/specs/shell.md). */
export const WRITE_HEADING = "Writing the filtered variants";

/** The words of the button that writes the file. */
export const WRITE_LABEL = "Write the filtered variants as a .nei file";

/** What the part says in place of the size while the variants are not
    counted: no counts of the filters, and no number of variants of the
    file. The Count is in the section of the filters, above. */
export const NO_SIZE_TEXT =
  "The size of the file is known once the variants are counted: Count, above.";

/** What the part says in place of the size while the variants are not
    counted and the Count that counts them runs, which a word that asks
    for the Count would not say. */
export const COUNTING_SIZE_TEXT =
  "The size of the file is known once the Count above ends.";

/** Why Write is disabled while the Count is in error with no button to
    count again, since popnei refused it or the browser can no longer read
    the variants file: a write makes the same pass over the same filters,
    and would fail the same way. */
export const COUNT_REFUSED_TEXT =
  "The variants could not be counted, so the file cannot be written either: the Count above says why.";

/** What the part says when a change of the filters dropped the file of
    the last write, which ended after it. */
export const DROPPED_TEXT =
  "The file was not kept, since the filters changed while it was written.";

/** The size of an estimate as the words say it: "about 20.0 MB", or "at
    most about 20.0 MB" when either count is a bound. */
function aboutSize(estimate: WriteEstimate): string {
  const size = sizeText(estimate.numBytes);
  return estimate.bound ? `at most about ${size}` : `about ${size}`;
}

/** The size expected beside the button: "About 20.0 MB: 20,000 variants
    of 1,000 individuals.", or "At most about 240 KB: 1,200 variants of
    200 individuals." when either count is a bound. */
export function estimateText(estimate: WriteEstimate): string {
  const about = aboutSize(estimate);
  return `${capitalized(about)}: ${counted(estimate.numVars, "variant")} of ${counted(estimate.numIndividuals, "individual")}.`;
}

/** The warning above the button for an estimate of `WRITE_WARN_BYTES` or
    more, after the "Warning:" that the widget of a warning puts before
    it. */
export function warnText(estimate: WriteEstimate): string {
  return `A file of ${aboutSize(estimate)} may need about six times that in the memory of this tab while it is written, and a browser may close a tab that asks for too much, losing the work since the project was last saved. On a phone or a tablet, the write fails with far smaller files. Save the project first. To write a smaller file, remove variants or individuals with the filters; to write any size, use popnei in Python.`;
}

/** Why the button is disabled for an estimate of `WRITE_MAX_BYTES` or
    more from the counts themselves. The 4 GB are what wasm addresses;
    popnei builds the file there, about 2.4 times its size in Chromium
    (writeVariants.md, "What was measured"). */
export function tooLargeText(estimate: WriteEstimate): string {
  return `A file of ${aboutSize(estimate)} cannot be written in a browser tab: popnei needs more than twice the file in its memory while it writes it, and a tab gives popnei at most 4 GB. Remove variants or individuals with the filters, or write the file with popnei in Python.`;
}

/** Why Write is disabled for an estimate from a bound of
    `WRITE_MAX_BYTES` or more before a Count, when a filter of the
    variants makes the variants of the file a bound: the Count gives the
    size in one pass, and while it runs, the words say that and do not
    ask for it. */
export function mayBeTooLargeText(
  estimate: WriteEstimate,
  counting: boolean,
): string {
  const then = counting
    ? "Its size is known once the Count above ends."
    : "Count the variants first, above.";
  return `A file of ${aboutSize(estimate)} may be too large to be written in a browser tab. ${then}`;
}

/** Why Write is disabled when the counts say the filters keep no variant
    of `p`: when the variants file holds none, the words of an empty
    source; otherwise the filters keep none. */
export function keptNoVariantText(p: Project): string {
  const read = p.variants?.read;
  if (read?.kind === "read" && read.numVars === 0) {
    return withoutTheStep(emptySourceText(p, "there is nothing to write"));
  }
  return `The filters keep none of the variants of ${variantsName(p)}, so there is nothing to write. Loosen the filters above.`;
}

/** What the part says when a write gave no variant, and the store kept
    no file, from the counts of its pass, `pass`: when the pass was given
    no variant, the variants file holds none, or none that passed for a
    VCF read with only those, in the words the analyses give an empty
    source; otherwise the filters kept none. */
export function noVariantText(p: Project, pass: PassStats): string {
  if (variantsOfFile(pass) === 0) {
    return withoutTheStep(emptySourceText(p, "there is nothing to write"));
  }
  return `The filters kept none of the variants of ${variantsName(p)}, so there is nothing to write. Loosen the filters above.`;
}

/** The words of the Save button: "Save panel.filtered.nei, 19.2 MB". */
export function saveLabel(name: string, numBytes: number): string {
  return `Save ${escaped(name)}, ${sizeText(numBytes)}`;
}

/** What the status region says when Save is pressed, since the button,
    which keeps the focus, turns into Write in silence
    (docs/specs/shell.md, "The status region"). */
export function handedText(name: string): string {
  return `${escaped(name)} was handed to the browser to save.`;
}

/** What the part says once the file was handed to the browser: the page
    is not told whether the browser kept it. `writable` when Write is
    offered, and the line then says how to save it again; not when Write
    is disabled, which a Count refused after the save can make. */
export function savedText(
  name: string,
  numBytes: number,
  writable: boolean,
): string {
  const handed = `${escaped(name)}, ${sizeText(numBytes)}, was handed to the browser to save.`;
  return writable ? `${handed} To save it again, write it again.` : handed;
}

/** What the line of a write under way is made of. */
export interface WritingLine {
  /** The name of the file written, "panel.filtered.nei". */
  readonly name: string;
  /** Whether the write waits for the statistics of each individual, and
      the line is of their calculation. */
  readonly waitsForStatistics: boolean;
  /** The share done, a whole percentage, or `null` before the first
      progress. */
  readonly share: number | null;
  /** The whole seconds since the request started. */
  readonly seconds: number;
  /** The name of the variants file the request waits to be opened again,
      after a stop; `null` otherwise. */
  readonly waitingFor: string | null;
}

/** The line beside the bar: "Writing panel.filtered.nei · 35% · 0:12",
    "Calculating the statistics of each individual, which the thresholds
    of the individuals need · 35% · 0:12"; with no share before the first
    progress; and "Waiting for panel.nei to be opened again, then writing
    panel.filtered.nei · 0:12" after a stop, until the first progress. */
export function writingText(line: WritingLine): string {
  const clock = clockText(line.seconds);
  const doing = line.waitsForStatistics
    ? `calculating ${STATISTICS_WORDS}`
    : `writing ${escaped(line.name)}`;
  if (line.share !== null) {
    return `${capitalized(doing)} · ${String(line.share)}% · ${clock}`;
  }
  if (line.waitingFor !== null) {
    return `Waiting for ${escaped(line.waitingFor)} to be opened again, then ${doing} · ${clock}`;
  }
  return `${capitalized(doing)} · ${clock}`;
}

/** The name of the bar: "Writing panel.filtered.nei", or "Calculating
    the statistics of each individual" while the write waits for them. */
export function writingBarLabel(
  name: string,
  waitsForStatistics: boolean,
): string {
  return waitsForStatistics ? STATISTICS_BAR_LABEL : `Writing ${escaped(name)}`;
}

/**
 * The words of a write that failed, the store's `error`: the statistics
 * it waited for, `ofStatistics`, with the words their own part gives the
 * failure; popnei's refusal of the write, in the words the analyses give
 * a genotype of another ploidy, and otherwise in its own; the worker that stopped with no
 * answer; a variants file the browser can no longer read, the
 * calculations that could not start and the page out of date, in the
 * diversity's words; an error of our own; each without "in the
 * Variants step", the step the part is in. `estimate` is the size
 * expected, which the words of a memory too small give, and leave out
 * when it is `null`. Throws a defect on a project with no variants file,
 * which a write in error always has, and on a failure of the files wasm,
 * which the calculation worker does not hold.
 */
export function writeErrorText(
  error: AnalysisError,
  ofStatistics: boolean,
  p: Project,
  estimate: WriteEstimate | null,
): string {
  return withoutTheStep(errorWords(error, ofStatistics, p, estimate));
}

/** The words of `writeErrorText`, as the rest of the application gives
    them. */
function errorWords(
  error: AnalysisError,
  ofStatistics: boolean,
  p: Project,
  estimate: WriteEstimate | null,
): string {
  const variants = p.variants;
  if (variants === null) {
    throw new Error(
      "popnei_web defect: the writing is in error with no variants file.",
    );
  }
  if (ofStatistics) {
    return statisticsFailedWords(
      error,
      p,
      (failure) => failureText(failure, variants.name),
      "the file was not written",
    );
  }
  if (error.kind === "refused") {
    const ploidy = otherPloidyText(error.message, p);
    if (ploidy !== null) {
      return `${escaped(writtenName(p, "nei"))} could not be written. ${ploidy}`;
    }
    const fit =
      estimate === null
        ? "The file may not fit"
        : `A file of ${aboutSize(estimate)} may not fit`;
    return `${escaped(writtenName(p, "nei"))} could not be written: popnei stopped with "${withoutStop(error.message)}". ${fit} in the memory of this tab: remove variants or individuals with the filters and write it again, or write the file with popnei in Python. If the message names a line of the VCF, correct the file, or fetch it again, and load it again.`;
  }
  const failure = error.error;
  switch (failure.kind) {
    case "workerFailed": {
      const size = estimate === null ? "" : `, of ${aboutSize(estimate)},`;
      return `The writing stopped unexpectedly, perhaps because the file${size} did not fit in the memory of this tab. Remove variants or individuals with the filters and write it again, or write the file with popnei in Python.`;
    }
    case "defect": {
      const message = withoutStop(failure.message);
      return `The application met an error of its own${message === "" ? "" : `: ${message}`}. Write the file again.`;
    }
    case "reopenFailed":
    case "couldNotStart":
    case "protocolMismatch":
    case "files":
      return failureText(failure, variants.name);
  }
}

/** A message without the spaces around it and the full stop it may end
    with, so that the sentence it is put in has one. */
function withoutStop(message: string): string {
  const trimmed = message.trim();
  return trimmed.endsWith(".") ? trimmed.slice(0, -1) : trimmed;
}

/** The name of the variants file of `p`, escaped; a defect with none. */
function variantsName(p: Project): string {
  if (p.variants === null) {
    throw new Error(
      "popnei_web defect: the words of the writing were asked with no variants file.",
    );
  }
  return escaped(p.variants.name);
}
