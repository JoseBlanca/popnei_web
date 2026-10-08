/**
 * What the download of the filtered variants on popgen2.html shows in the
 * place of its button, from the one pass and the store's write, and what
 * the end of a write and "Save it again" do with the file
 * (docs/specs/steps/popgen2-download.md, "The states", "When the write
 * ends" and "What it sends and reads"). Apart from the component, so that
 * a test in node runs them over a store made with a fake worker.
 */

import { writtenName } from "../../core/fileNames.ts";
import type { IndividualsKept } from "../../core/individualsKept.ts";
import { keptNoneReason } from "../../core/individualsKept.ts";
import { noVariantForCertain } from "../../core/noVariantKept.ts";
import type { Project } from "../../core/project.ts";
import type { AnalysisStatus, Store, WriteStatus } from "../../core/store.ts";
import type {
  JobResult,
  VariantsSummaryResult,
  Written,
} from "../../worker/protocol.ts";
import type { FileHanded } from "./downloadWords.ts";
import {
  DOWNLOAD_NEEDS,
  DOWNLOAD_WAITS,
  downloadedText,
  noVariantText,
} from "./downloadWords.ts";

/** What takes the place of the button. */
export type DownloadPlace =
  /** The button, disabled, with its reason beside it: the one pass is not
      finished, or failed. */
  | { readonly kind: "disabled"; readonly reason: string }
  /** The button, enabled: the write can start, or runs, or failed, which
      the dialog shows. */
  | { readonly kind: "enabled" }
  /** A sentence: the filters of the individuals keep none, or keep no
      variant, before the write when it is certain or after it. */
  | { readonly kind: "sentence"; readonly text: string }
  /** The text after the download, of a file handed to the browser, the
      store's `saved`, or of one written and not handed, its `done`. */
  | {
      readonly kind: "file";
      readonly handed: FileHanded;
      readonly text: string;
    };

/**
 * What takes the place of the button, from the status of the one pass,
 * `summary`, the store's write, `write`, the project `p` and the
 * individuals kept, `kept`: the button disabled until the one pass is
 * finished, with the reason of a pass not finished or of one failed;
 * once it is, the words of no individual kept, the text after a download
 * or the sentence of no variant after a write, the sentence of no variant
 * when the finished pass makes it certain, and otherwise the button.
 * `noVariantForCertain` is asked only over the finished pass, never over
 * a result so far nor one kept after a Stop. A defect for a project with
 * no variants file read, for a store with no write, and for a lock that
 * is not of the filters of the individuals, which cannot hold once the
 * one pass is finished on this page.
 */
export function downloadPlace(
  summary: AnalysisStatus<JobResult>,
  write: WriteStatus<Blob> | null,
  p: Project,
  kept: IndividualsKept | null,
): DownloadPlace {
  switch (summary.kind) {
    case "error":
      return { kind: "disabled", reason: DOWNLOAD_NEEDS };
    case "locked":
    case "ready":
    case "removed":
    case "running":
      return { kind: "disabled", reason: DOWNLOAD_WAITS };
    case "done":
      break;
  }
  const result = summaryOf(summary.result);
  if (write === null) {
    throw new Error(
      "popnei_web defect: the store of popgen2.html has no write.",
    );
  }
  switch (write.kind) {
    case "locked": {
      const reason = keptNoneReason(p, kept, null);
      if (reason === null) {
        throw new Error(
          `popnei_web defect: the write of popgen2.html is locked once the one pass is finished, for another reason than no individual kept: ${write.reason}`,
        );
      }
      return { kind: "sentence", text: reason };
    }
    case "saved":
    case "done":
      return {
        kind: "file",
        handed: write.kind === "saved" ? "downloaded" : "written",
        text: fileText(write.written, write.kind, p, kept),
      };
    case "noVariant":
      return { kind: "sentence", text: noVariantSentence(p, result) };
    case "ready":
      return noVariantForCertain(p, result, kept)
        ? { kind: "sentence", text: noVariantSentence(p, result) }
        : { kind: "enabled" };
    case "running":
    case "error":
      return { kind: "enabled" };
  }
}

/** The result of the one pass, a defect for another. */
function summaryOf(result: JobResult): VariantsSummaryResult {
  if (result.analysis !== "variantsSummary") {
    throw new Error(
      `popnei_web defect: the summary of the variants file has a result of ${result.analysis}.`,
    );
  }
  return result;
}

/** The sentence of no variant, with the variants of the file the one
    pass read. */
function noVariantSentence(p: Project, result: VariantsSummaryResult): string {
  return noVariantText(readOf(p).name, result.passStats.numVars);
}

/** The text after the download of `written`, of the store's `saved` or
    `done`. */
function fileText(
  written: Written<Blob>,
  kind: "saved" | "done",
  p: Project,
  kept: IndividualsKept | null,
): string {
  if (kept === null) {
    throw new Error(
      "popnei_web defect: a file was written with no individuals kept known.",
    );
  }
  return downloadedText({
    name: writtenName(p, written.format),
    numBytes: written.numBytes,
    passStats: written.passStats,
    kept,
    numIndividuals: readOf(p).individuals.length,
    handed: kind === "saved" ? "downloaded" : "written",
  });
}

/** The name and the individuals of the variants file of `p`, read; a
    defect otherwise. */
function readOf(p: Project): {
  readonly name: string;
  readonly individuals: readonly string[];
} {
  const variants = p.variants;
  if (variants?.read.kind !== "read") {
    throw new Error(
      "popnei_web defect: the download asked of a variants file not read.",
    );
  }
  return { name: variants.name, individuals: variants.read.individuals };
}

/** The browser's download of a file, `downloadFile` of src/ui/download.ts
    on the page. */
export type DownloadFile = (name: string, file: Blob) => void;

/** How a write the page awaited ended, as the store holds it. */
export type WriteEnd =
  /** With a file, handed to the browser and then to the store as
      saved. */
  | "downloaded"
  /** With no variant, and nothing to download. */
  | "noVariant"
  /** In a failure, which the dialog shows. */
  | "failed"
  /** Otherwise: stopped, whose Stop closed the dialog. */
  | "other";

/**
 * What the page does when a write it awaited has ended: with a file, the
 * store's `done`, it hands the file to the browser under its name,
 * `download`, and then tells the store, `writeSaved`; if `download`
 * throws, a defect of ours, the store is not told, and the throw goes
 * on. Gives how the write ended.
 */
export function endOfWrite(
  store: Store<JobResult, Blob>,
  download: DownloadFile,
): WriteEnd {
  const { write, project } = store.getState();
  switch (write?.kind) {
    case "done":
      download(writtenName(project, write.written.format), write.written.file);
      store.writeSaved();
      return "downloaded";
    case "noVariant":
      return "noVariant";
    case "error":
      return "failed";
    case "locked":
    case "saved":
    case "running":
    case "ready":
    case undefined:
      return "other";
  }
}

/**
 * "Save it again": hands the file the store keeps in its `saved` to the
 * browser again, under the same name; or, "Save it", the file of its
 * `done`, and then tells the store. A defect in any other state, in
 * which neither button is drawn.
 */
export function saveAgain(
  store: Store<JobResult, Blob>,
  download: DownloadFile,
): void {
  const { write, project } = store.getState();
  if (write?.kind !== "saved" && write?.kind !== "done") {
    throw new Error(
      `popnei_web defect: Save it again was pressed with the writing ${write?.kind ?? "absent"}.`,
    );
  }
  download(writtenName(project, write.written.format), write.written.file);
  if (write.kind === "done") store.writeSaved();
}
