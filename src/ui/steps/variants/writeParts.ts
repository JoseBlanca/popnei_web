/**
 * What the section of the writing of the Variants step shows in each
 * state of the writing (docs/specs/analyses/writeVariants.md, "The
 * step's part", "The states"): the line or the error above the button,
 * the warning of the memory, and the one button, Write, Stop or Save,
 * with what describes it. Pure, so that a test in node checks each state;
 * `WriteSection.tsx` draws it, with the bar of a write under way.
 */

import { writtenName } from "../../../core/fileNames.ts";
import { variantFilterNeeds } from "../../../core/project.ts";
import { filtersApplied } from "../../../core/filtersApplied.ts";
import type { Project } from "../../../core/project.ts";
import type { WriteStatus } from "../../../core/store.ts";
import { WRITE_MAX_BYTES } from "../../../core/writeEstimate.ts";
import type { WriteEstimate } from "../../../core/writeEstimate.ts";
import {
  COUNTING_SIZE_TEXT,
  COUNT_REFUSED_TEXT,
  DROPPED_TEXT,
  NO_SIZE_TEXT,
  estimateText,
  keptNoVariantText,
  mayBeTooLargeText,
  noVariantText,
  savedText,
  tooLargeText,
  warnText,
  writeErrorText,
} from "./writeWords.ts";
import { lockedInTheStep } from "./words.ts";

/** What the Count of the filters is doing, as the section needs it:
    `counted` when its counts are those of the filters as they are;
    `counting` while it runs; `refused` in error with no button to count
    again, a refusal of popnei or a variants file the browser can no
    longer read; `notCounted` otherwise, with its button offered. */
export type CountState = "notCounted" | "counting" | "counted" | "refused";

/** Write, disabled with the reason as its description when the store
    locks it or the write would fail or give no file, and otherwise
    described by the size expected, by why it is not known, or, once a
    file was saved, by nothing. */
export interface WriteOffered {
  readonly kind: "write";
  readonly disabled: boolean;
  readonly description: string | null;
}

/** The one button of the section. */
export type WriteButton =
  | WriteOffered
  /** Stop, of the write or of the statistics it waits for. */
  | { readonly kind: "stop" }
  /** Save, of the file of `name` and `numBytes`. */
  | { readonly kind: "save"; readonly name: string; readonly numBytes: number };

/** What the section shows, besides its heading and the bar. */
export interface WriteParts {
  /** The words above the button: a line, or the error of a failure,
      `problem`; `null` for none. */
  readonly message: {
    readonly kind: "line" | "problem";
    readonly text: string;
  } | null;
  /** The warning of the memory above Write, after "Warning:", or
      `null`. */
  readonly warning: string | null;
  /** The button, or `null` when the state offers none. */
  readonly button: WriteButton | null;
}

/**
 * Write where the state offers it, for the size expected `estimate` of
 * the project `p` and the Count in the state `count` (writeVariants.md,
 * "The size, before the write"): disabled after a Count refused, which a
 * write would meet the same way; when the counts say the filters keep no
 * variant, or the file holds none; for a file too large from the counts;
 * and for a bound of `WRITE_MAX_BYTES` or more from the variants of the
 * file before a Count. Otherwise described by the size expected, or by
 * why it is not known, with no word that asks for a Count while it runs.
 */
function writeButton(
  estimate: WriteEstimate | null,
  p: Project,
  count: CountState,
): WriteOffered {
  const disabled = (description: string): WriteOffered => ({
    kind: "write",
    disabled: true,
    description,
  });
  const offered = (description: string): WriteOffered => ({
    kind: "write",
    disabled: false,
    description,
  });
  if (count === "refused") {
    return disabled(COUNT_REFUSED_TEXT);
  }
  if (estimate === null) {
    return offered(count === "counting" ? COUNTING_SIZE_TEXT : NO_SIZE_TEXT);
  }
  if (estimate.numVars === 0) {
    return disabled(keptNoVariantText(p));
  }
  if (estimate.tooLarge) {
    return disabled(tooLargeText(estimate));
  }
  // The variants are a bound while a filter of the variants is not
  // counted; a bound of the individuals alone, which the Count does not
  // make exact, is not refused.
  const variantsBound = count !== "counted" && filtersApplied(p).length > 0;
  if (variantsBound && estimate.numBytes >= WRITE_MAX_BYTES) {
    return disabled(mayBeTooLargeText(estimate, count === "counting"));
  }
  return offered(estimateText(estimate));
}

/**
 * The parts of the section in the state `write` of the project `p`, with
 * the size expected `estimate`, `null` when the variants are not counted,
 * and the Count in the state `count`, which decides the words of no size
 * and whether a large bound or a refused Count disables Write.
 * Write is offered in `ready`, `saved`, and `error` after a failure that
 * is neither popnei's refusal nor a variants file the browser can no
 * longer read, of the write or of the statistics it waited for, since
 * those fail again the same; disabled in `locked`, with the store's
 * reason, and in the cases of `writeButton`, with the warning of the
 * memory only while Write can be pressed; described by nothing once
 * saved, so that the size written is the one size of the section. No
 * button in `noVariant`, whose filters give the same file of no variant
 * again. Every text leaves out "in the Variants step", the step the
 * section is in.
 */
export function writeParts(
  write: WriteStatus<Blob>,
  estimate: WriteEstimate | null,
  p: Project,
  count: CountState = "notCounted",
): WriteParts {
  const button = writeButton(estimate, p, count);
  const offered: WriteParts = {
    message: null,
    warning:
      estimate !== null && estimate.warn && !button.disabled
        ? warnText(estimate)
        : null,
    button,
  };
  const line = (text: string): WriteParts["message"] => ({
    kind: "line",
    text,
  });
  switch (write.kind) {
    case "locked":
      return {
        message: null,
        warning: null,
        button: {
          kind: "write",
          disabled: true,
          description: lockedInTheStep(write.reason, variantFilterNeeds(p)),
        },
      };
    case "ready":
      return write.dropped
        ? { ...offered, message: line(DROPPED_TEXT) }
        : offered;
    case "saved":
      return {
        ...offered,
        message: line(
          savedText(writtenName(p), write.written.numBytes, !button.disabled),
        ),
        button: button.disabled ? button : { ...button, description: null },
      };
    case "running":
      return { message: null, warning: null, button: { kind: "stop" } };
    case "done":
      return {
        message: null,
        warning: null,
        button: {
          kind: "save",
          name: writtenName(p),
          numBytes: write.written.numBytes,
        },
      };
    case "noVariant":
      return {
        message: line(noVariantText(p, write.written.passStats)),
        warning: null,
        button: null,
      };
    case "error": {
      const message = {
        kind: "problem",
        text: writeErrorText(write.error, write.ofStatistics, p, estimate),
      } as const;
      const again =
        write.error.kind === "failed" &&
        write.error.error.kind !== "reopenFailed";
      return again
        ? { ...offered, message }
        : { message, warning: null, button: null };
    }
  }
}
