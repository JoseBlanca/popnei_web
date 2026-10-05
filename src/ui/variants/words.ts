/**
 * The words of the page that opens a variants file, popgen2.html
 * (docs/plans/open-variants.md, "Two widgets"): the button and the zone,
 * the files it does not open, the options of a VCF, the lines of what the
 * file holds, the count of its variants, the refusals and failures of
 * that count, and what the status region says as the file is read and
 * counted. They are the page's own, since the words of the rest of the
 * application send the user to a Variants step this page does not have.
 * Pure, so that a test in node checks them; the widgets draw them.
 */

import { BGZIP_REFUSAL, EMPTY_SOURCE } from "../../core/analyses/words.ts";
import {
  counted,
  escaped,
  saying,
  shown,
  variantsOpenNeeds,
} from "../../core/project.ts";
import type { Project, VariantSource } from "../../core/project.ts";
import type {
  AnalysisError,
  AnalysisStatus,
  AppState,
} from "../../core/store.ts";
import { sizeText } from "../../core/writeEstimate.ts";
import type { JobResult, VcfReadOptions } from "../../worker/protocol.ts";
import { formatText } from "../steps/variants/words.ts";

/** The id of the summary of the variants file. */
export const SUMMARY_ID = "variantsSummary";

/** The button that opens the file picker, before a file is open. */
export const OPEN_LABEL = "Open a variants file…";

/** The same button once a file is open. */
export const OPEN_ANOTHER_LABEL = "Open another variants file…";

/** The name of the zone's hidden button that takes a pasted file. */
export const PASTE_LABEL = "Paste a variants file";

/** The line of the zone before a file is open. */
export const DROP_HINT = "Drop a VCF or a .nei file here, or open one.";

/** What the page says when several files are dropped or pasted at once. */
export const SEVERAL_DROPPED = "Open one variants file at a time.";

/** What the page says when a folder is dropped or pasted. */
export const FOLDER_DROPPED = "Open a VCF or a .nei file, not a folder.";

/** What the page says when a piece of text is dropped or pasted. */
export const TEXT_DROPPED = "Open a VCF or a .nei file, not a piece of text.";

/** What the page says of a file of another name, which it did not open. */
export function notOpenedText(name: string): string {
  return `${escaped(name)} was not opened: a variants file is a VCF, whose name ends in .vcf, .vcf.gz or .vcf.bgz, or a .nei file. If it is one of them, rename it.`;
}

/** The heading of the options of a VCF. */
export const VCF_OPTIONS_HEADING = "How a VCF is read";

/** The line under the ploidy: a VCF does not say it, and a change reads
    the open VCF again. */
export const PLOIDY_DESCRIPTION =
  "A VCF does not say its ploidy, so it is given here, and the page does not check it against the genotypes. Changing it, or the box below, reads an open VCF again and counts its variants again.";

/** The heading of the summary. */
export const SUMMARY_HEADING = "What the file holds";

/** The line of the format and the size: "VCF · 1.2 MB". */
export function formatAndSizeText(variants: VariantSource): string {
  return `${formatText(variants.format)} · ${sizeText(variants.size)}`;
}

/** The line of the ploidy: for a VCF, the one given, since the file does
    not say it and the count does not read the genotypes; for a `.nei`
    file, the file's. */
export function ploidyLine(ploidy: number, isVcf: boolean): string {
  return isVcf
    ? `Ploidy ${String(ploidy)}, as given to read the VCF`
    : `Ploidy ${String(ploidy)}, as the file says`;
}

/** The line of the variants a VCF was read with. */
export function passedLine(options: VcfReadOptions): string {
  return options.onlyPassed
    ? "Only the variants with PASS or . in the FILTER column were read"
    : "Every variant was read, whatever its FILTER column";
}

/** The heading of the count of the variants. */
export const COUNT_HEADING = "Variants";

/** The count in the middle of a sentence, which names its bar,
    "Calculating the variants on each chromosome". */
export const COUNT_NAME = "the variants on each chromosome";

/** The button that counts again after a Stop or a failure. */
export const COUNT_AGAIN_LABEL = "Count again";

/** The line of a count stopped, and what the status region says of it. */
export const STOPPED_TEXT =
  "Counting the variants was stopped. Count again counts them from the start.";

/** The line of the count: "1,200 variants on 1 chromosome." */
export function countedText(numVars: number, numChroms: number): string {
  return `${counted(numVars, "variant")} on ${counted(numChroms, "chromosome")}.`;
}

/** The caption of the table of the chromosomes. */
export const CHROMS_CAPTION = "Variants on each chromosome";

/** The headers of its columns. */
export const CHROM_COLUMN = "Chromosome";
export const NUM_VARS_COLUMN = "Variants";

/** popnei's refusal of a variant at the position 0. */
const POSITION_ZERO =
  /^a variant of the chromosome (.*?) is at the position 0,/su;

/** popnei's refusal of a window that ends past 2^53, which, with one
    window per chromosome, only a position of 2^53 or more gives. */
const PAST_LARGEST =
  /^the window \d+ to \d+ of the chromosome (.*?) ends past/su;

/**
 * The words of popnei's refusal `message` of the count of the variants
 * of `p`: a file of no variant, or, for a VCF read with only the passed
 * variants, none that passed; a variant at the position 0; a position of
 * 2^53 or more; a line of the VCF popnei cannot read, or a gzipped file
 * damaged or cut short; any other, with popnei's message. Throws a defect
 * on a project with no variants file.
 */
export function refusalText(message: string, p: Project): string {
  const variants = p.variants;
  if (variants === null) {
    throw new Error(
      "popnei_web defect: a refusal of the count was given a project with no variants file.",
    );
  }
  const fileName = escaped(variants.name);
  if (message.startsWith(EMPTY_SOURCE)) {
    return variants.readOptions?.onlyPassed === true
      ? `${fileName} has no variant with PASS or . in its FILTER column, and it was read with only those, so there is nothing to count. Untick "Only the variants with PASS or . in the FILTER column" under "How a VCF is read", and the file is read again with every variant.`
      : `${fileName} has no variants. Open another variants file.`;
  }
  const zero = POSITION_ZERO.exec(message);
  if (zero !== null) {
    return `A variant of chromosome ${shown(zero[1] ?? "")} in ${fileName} is at position 0, where the VCF format puts a telomere and not a variant, so the variants cannot be counted. Remove that line from the file and open it again.`;
  }
  const past = PAST_LARGEST.exec(message);
  if (past !== null) {
    return `A variant of chromosome ${shown(past[1] ?? "")} in ${fileName} is at a position beyond 2,147,483,647, the largest the VCF format allows, and too large for the application to count. Correct the position in the file and open it again.`;
  }
  if (
    /^line \d+ of the VCF/u.test(message) ||
    message.startsWith(BGZIP_REFUSAL)
  ) {
    return `popnei could not read ${fileName}${saying(message.replaceAll("`", ""))}. Correct the file, or fetch it again, and open it again.`;
  }
  return `popnei could not count the variants of ${fileName}${saying(message.replaceAll("`", ""))}. Open the file again, or another file.`;
}

/**
 * The words of a count that failed: popnei's refusal, `refusalText`, or
 * another failure, with what to do on this page. A failure of the files
 * wasm is a defect, since the calculation worker holds none.
 */
export function failedText(error: AnalysisError, p: Project): string {
  if (error.kind === "refused") return refusalText(error.message, p);
  const fileName = escaped(p.variants?.name ?? "the file");
  const failure = error.error;
  switch (failure.kind) {
    case "reopenFailed":
      return `${escaped(failure.name)} could not be read again; it may have changed on the disk since it was opened. Open it again.`;
    case "workerFailed":
      return `The count stopped unexpectedly. Count again. If it stops again, open ${fileName} again.`;
    case "defect":
      return `The application met an error of its own${saying(failure.message)}. Count again.`;
    case "couldNotStart":
      return `The application could not start its calculations. Reload the page and open ${fileName} again.`;
    case "protocolMismatch":
      return `The page is out of date. Reload the page and open ${fileName} again.`;
    case "files":
      throw new Error(
        `popnei_web defect: the count failed in the files wasm, which the calculation worker does not hold: ${failure.message}`,
      );
  }
}

/** Whether Count again can mend the failure `error`: not popnei's
    refusal, which the same file gives again, nor a file the browser can
    no longer read, which a new opening mends. */
export function countAgainMends(error: AnalysisError): boolean {
  return error.kind === "failed" && error.error.kind !== "reopenFailed";
}

/** The status of the summary in `s`; a defect when the store has none. */
export function summaryStatus(
  s: AppState<JobResult, unknown>,
): AnalysisStatus<JobResult> {
  const view = s.analyses.find((a) => a.id === SUMMARY_ID);
  if (view === undefined) {
    throw new Error(
      "popnei_web defect: the store has no summary of the variants file.",
    );
  }
  return view.status;
}

/**
 * What the status region says of a change of the store from `before` to
 * `after`, which the user may not be looking at: the file read, with its
 * individuals, or why it was not; and the count done, with its numbers,
 * or why it failed.
 */
export function announcementsOf(
  before: AppState<JobResult, unknown>,
  after: AppState<JobResult, unknown>,
): readonly string[] {
  const texts: string[] = [];
  const variants = after.project.variants;
  if (variants === null) return texts;
  const was = before.project.variants;
  const wasPending =
    was?.fileId === variants.fileId && was.read.kind === "pending";
  if (wasPending && variants.read.kind === "read") {
    texts.push(
      `${escaped(variants.name)} is open: ${counted(variants.read.individuals.length, "individual")}.`,
    );
  }
  if (wasPending && variants.read.kind === "failed") {
    const reason = variantsOpenNeeds(after.project);
    if (reason !== null) texts.push(reason);
  }
  const then = summaryStatus(before);
  const now = summaryStatus(after);
  if (
    now.kind === "done" &&
    then.kind !== "done" &&
    now.result.analysis === SUMMARY_ID
  ) {
    texts.push(
      `${escaped(variants.name)}: ${countedText(now.result.passStats.numVars, now.result.chroms.length)}`,
    );
  }
  if (now.kind === "error" && then.kind !== "error") {
    texts.push(failedText(now.error, after.project));
  }
  return texts;
}
