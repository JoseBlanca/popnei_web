/**
 * What the section of the writing of the Variants step shows in each
 * state of the writing (docs/specs/analyses/writeVariants.md, "The
 * step's part", "The states"): the line or the error above the button,
 * the warning of the memory, and the one button, Write, Stop or Save,
 * with what describes it. Pure, so that a test in node checks each state;
 * `WriteSection.tsx` draws it, with the bar of a write under way.
 */

import { writtenName } from "../../../core/fileNames.ts";
import type { Project } from "../../../core/project.ts";
import type { WriteStatus } from "../../../core/store.ts";
import type { WriteEstimate } from "../../../core/writeEstimate.ts";
import {
  DROPPED_TEXT,
  NO_SIZE_TEXT,
  estimateText,
  noVariantText,
  savedText,
  tooLargeText,
  warnText,
  writeErrorText,
} from "./writeWords.ts";

/** The one button of the section. */
export type WriteButton =
  /** Write, disabled with the reason as its description when the store
      locks it or the file would be too large, and otherwise described by
      the size expected, or by why it is not known. */
  | {
      readonly kind: "write";
      readonly disabled: boolean;
      readonly description: string;
    }
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
 * The parts of the section in the state `write` of the project `p`, with
 * the size expected `estimate`, `null` when the variants are not counted.
 * Write is offered in `ready`, `saved`, and `error` after a failure that
 * is neither popnei's refusal nor a variants file the browser can no
 * longer read, of the write or of the statistics it waited for, since
 * those fail again the same; disabled in `locked` and for a file too
 * large. No button in `noVariant`, whose filters give the same file of
 * no variant again.
 */
export function writeParts(
  write: WriteStatus<Blob>,
  estimate: WriteEstimate | null,
  p: Project,
): WriteParts {
  const offered: WriteParts = {
    message: null,
    warning:
      estimate !== null && estimate.warn && !estimate.tooLarge
        ? warnText(estimate)
        : null,
    button:
      estimate?.tooLarge === true
        ? {
            kind: "write",
            disabled: true,
            description: tooLargeText(estimate),
          }
        : {
            kind: "write",
            disabled: false,
            description:
              estimate === null ? NO_SIZE_TEXT : estimateText(estimate),
          },
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
        button: { kind: "write", disabled: true, description: write.reason },
      };
    case "ready":
      return write.dropped
        ? { ...offered, message: line(DROPPED_TEXT) }
        : offered;
    case "saved":
      return {
        ...offered,
        message: line(savedText(writtenName(p), write.written.numBytes)),
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
