/**
 * The words of the page that opens a variants file, popgen2.html
 * (docs/plans/open-variants.md, "Two widgets"): the button and the zone,
 * the files it does not open, the options of a VCF, the lines of the box
 * of the file open, the count of its variants, the refusals and failures of
 * that count, and what the status region says as the file is read and
 * counted. They are the page's own, since the words of the rest of the
 * application send the user to a Variants step this page does not have.
 * Pure, so that a test in node checks them; the widgets draw them.
 */

import {
  EMPTY_SOURCE,
  SOURCE_UNREADABLE,
  isVcfLineRefusal,
} from "../../core/analyses/words.ts";
import {
  counted,
  escaped,
  grouped,
  saying,
  shown,
  variantsOpenNeeds,
  withoutBackquotes,
} from "../../core/project.ts";
import type { Project, VariantSource } from "../../core/project.ts";
import type {
  AnalysisError,
  AnalysisStatus,
  AppState,
} from "../../core/store.ts";
import { sizeText } from "../../core/writeEstimate.ts";
import type { JobResult, VcfReadOptions } from "../../worker/protocol.ts";
import { ONLY_PASSED_LABEL } from "../steps/variants/words.ts";

/** The id of the summary of the variants file. */
export const SUMMARY_ID = "variantsSummary";

/** The button that opens the file picker, before a file is open. */
export const OPEN_LABEL = "Open variants file…";

/** The same button once a file is open. */
export const OPEN_ANOTHER_LABEL = "Open another variants file…";

/** The name of the zone's hidden button that takes a pasted file. */
export const PASTE_LABEL = "Paste a variants file";

/** The name of the widget that opens a variants file, which has no
    heading of its own. */
export const OPENING_NAME = "Variants file";

/** The label of the ploidy a VCF is read with, beside the open button. */
export const DEFAULT_PLOIDY_LABEL = "Default ploidy";

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

/** The name of the box of the file open, above the open button, which
    has no heading: what a screen reader calls it, and the heading drawn
    in its place when it fails. */
export const INFO_NAME = "File information";

/** The first line of the box: "panel.vcf.gz · 87 KB". */
export function nameAndSizeText(variants: VariantSource): string {
  return `${escaped(variants.name)} · ${sizeText(variants.size)}`;
}

/** The line of the individuals: "Individuals: 200". */
export function individualsLine(numIndividuals: number): string {
  return `Individuals: ${grouped(numIndividuals)}`;
}

/** The line of the individuals while the file is read, before its
    seconds. */
export const READING_LINE = "Individuals: reading the file.";

/** The line of the variants once counted, and for a VCF read with only
    the passed ones, which: "Variants: 1,200 (only those with PASS or . in
    the FILTER column)". */
export function variantsLine(
  numVars: number,
  readOptions: VcfReadOptions | null,
): string {
  const line = `Variants: ${grouped(numVars)}`;
  return readOptions?.onlyPassed === true
    ? `${line} (only those with PASS or . in the FILTER column)`
    : line;
}

/** The line of the chromosomes once counted: "Chromosomes: 1". */
export function chromosomesLine(numChroms: number): string {
  return `Chromosomes: ${grouped(numChroms)}`;
}

/** The lines of the variants and the chromosomes before their count. */
export const VARIANTS_NOT_COUNTED = "Variants: not counted yet";
export const CHROMOSOMES_NOT_COUNTED = "Chromosomes: not counted yet";

/** The line of the ploidy: for a VCF, the one of the field Default
    ploidy, which the page does not check, since the file does not give it
    and the count does not read the genotypes; for a `.nei` file, the
    file's. */
export function ploidyLine(
  ploidy: number,
  readOptions: VcfReadOptions | null,
): string {
  return readOptions === null
    ? `Ploidy: ${String(ploidy)} (given by the file)`
    : `Ploidy: ${String(ploidy)} (the ${DEFAULT_PLOIDY_LABEL}, not checked against the genotypes)`;
}

/** The line of the ploidy of a `.nei` file being read. */
export const PLOIDY_NOT_READ = "Ploidy: not read yet";

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
    // popnei gives the same refusal for a file of no variant and for one
    // whose variants all have another FILTER, so the words hold for both.
    return variants.readOptions?.onlyPassed === true
      ? `${fileName} has no variant, or none with PASS or . in its FILTER column. If its variants have another FILTER, untick "${ONLY_PASSED_LABEL}" and it is read again with every variant; otherwise open another variants file.`
      : `${fileName} has no variants. Open another variants file.`;
  }
  if (message.startsWith(SOURCE_UNREADABLE)) {
    return `${fileName} could not be read to its end: it may be damaged or cut short. Fetch or copy it again, and open it again.`;
  }
  const zero = POSITION_ZERO.exec(message);
  if (zero !== null) {
    return `A variant of chromosome ${shown(zero[1] ?? "")} in ${fileName} is at position 0, where the VCF format puts a telomere and not a variant, so the variants cannot be counted. Remove that line from the file and open it again.`;
  }
  const past = PAST_LARGEST.exec(message);
  if (past !== null) {
    return `A variant of chromosome ${shown(past[1] ?? "")} in ${fileName} is at a position beyond 2,147,483,647, the largest the VCF format allows, and too large for the application to count. Correct the position in the file and open it again.`;
  }
  const words = saying(withoutBackquotes(message));
  if (isVcfLineRefusal(message)) {
    return `popnei could not read ${fileName}${words}. Correct the file, or fetch it again, and open it again.`;
  }
  return `popnei could not count the variants of ${fileName}${words}. Open the file again, or another file.`;
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
      // The entry gives the defect to the error bar, which tells it whole.
      return "The count stopped on an error of the application itself. The error bar says what it was, and its details can be copied for a report.";
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

/** Whether Count again can mend the failure `error`: a worker that
    stopped, and none of these: popnei's refusal, which the same file
    gives again; a file the browser can no longer read, which a new
    opening mends; a worker that could not start or a page out of date,
    which the client fails at once until the page is reloaded; a defect of
    our own code, which the error bar tells. */
export function countAgainMends(error: AnalysisError): boolean {
  return error.kind === "failed" && error.error.kind === "workerFailed";
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

/** What the status region says as a read starts: "Reading panel.nei.",
    and for a VCF the options it is read with, the ploidy and which
    variants, "Reading panel.vcf.gz, with ploidy 4 and every variant,
    whatever its FILTER column.", so that a change of either is heard. */
export function readingText(variants: VariantSource): string {
  const name = escaped(variants.name);
  const options = variants.readOptions;
  if (options === null) return `Reading ${name}.`;
  const which = options.onlyPassed
    ? "only the variants with PASS or . in the FILTER column"
    : "every variant, whatever its FILTER column";
  return `Reading ${name}, with ploidy ${String(options.ploidy)} and ${which}.`;
}

/** The name of the bar of the count. */
export const COUNT_BAR_LABEL = "Counting the variants";

/** The line under the bar of the count: "Counting the variants · 6% · 12
    seconds so far", or with no share before the first progress; the
    seconds as the line of a read gives them. */
export function countingText(share: number | null, seconds: number): string {
  const time = `${counted(seconds, "second")} so far`;
  return share === null
    ? `${COUNT_BAR_LABEL} · ${time}`
    : `${COUNT_BAR_LABEL} · ${String(share)}% · ${time}`;
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
  if (was?.fileId !== variants.fileId && variants.read.kind === "pending") {
    texts.push(readingText(variants));
  }
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
