/**
 * The words of the page that opens a variants file, popgen2.html
 * (docs/plans/open-variants.md, "Two widgets" and "Round 3"): the button
 * and the zone, the files it does not open, the lines of the box of the
 * file open, a file popnei could not open, the count of its variants, the
 * refusals and failures of that count, and what the status region says as
 * the file is read and counted. They are the page's own, since the words of the rest of the
 * application send the user to a Variants step this page does not have.
 * Pure, so that a test in node checks them; the widgets draw them.
 */

import {
  BGZIP_REFUSAL,
  EMPTY_SOURCE,
  SOURCE_UNREADABLE,
  isVcfLineRefusal,
} from "../../core/analyses/words.ts";
import {
  counted,
  escaped,
  grouped,
  isHidden,
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
import type { JobResult } from "../../worker/protocol.ts";

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

/* Each line of the box keeps one row at 320 pixels in every state of
   the read and of the count, so that the box keeps its height and the
   open button under it does not move under the pointer as a count ends:
   the words of a value not known yet are short. */

/** The lines of the individuals, the variants, the chromosomes and the
    ploidy while the file is read. */
export const INDIVIDUALS_READING = "Individuals: reading…";
export const VARIANTS_READING = "Variants: reading…";
export const CHROMOSOMES_READING = "Chromosomes: reading…";
export const PLOIDY_READING = "Ploidy: reading…";

/** The line under the lines while the file is read, before its
    seconds. */
export const READING_TIME_LINE = "Reading the file.";

/** The line of the variants once counted: "Variants: 1,200", every
    variant of the file, whatever its FILTER column. */
export function variantsLine(numVars: number): string {
  return `Variants: ${grouped(numVars)}`;
}

/** The line of the variants while they are counted: "Variants:
    counting… 6%", with no share before the first progress. */
export function countingVariantsLine(share: number | null): string {
  return share === null
    ? "Variants: counting…"
    : `Variants: counting… ${String(share)}%`;
}

/** The line of the chromosomes while the variants are counted. */
export const CHROMOSOMES_COUNTING = "Chromosomes: counting…";

/** The line of the chromosomes once counted: "Chromosomes: 1". */
export function chromosomesLine(numChroms: number): string {
  return `Chromosomes: ${grouped(numChroms)}`;
}

/** The lines of the variants and the chromosomes after a Stop or a
    failure of their count. */
export const VARIANTS_NOT_COUNTED = "Variants: not counted";
export const CHROMOSOMES_NOT_COUNTED = "Chromosomes: not counted";

/** The line of the ploidy of a file read: "Ploidy: 2". Every ploidy on
    this page is the file's: a `.nei` file holds it, and popnei reads that
    of a VCF from its first genotype that is not a single dot. */
export function ploidyLine(ploidy: number): string {
  return `Ploidy: ${String(ploidy)}`;
}

/** popnei's refusal of a VCF opened with no ploidy whose first variants,
    up to 4096 of them, hold no genotype with alleles: every genotype a
    single dot, or no GT field in the FORMAT column, which popnei does not
    tell apart; their number, or none for one. */
const PLOIDY_NOT_READ =
  /^(?:the first (\d+) data lines of the VCF hold|the one data line of the VCF holds) no genotype with alleles/u;

/** popnei's refusal of a VCF opened with no ploidy that has a header and
    no variant. */
const PLOIDY_OF_NO_VARIANTS =
  "the file has no variants and the ploidy can't be inferred";

/** The name of the `.nei` file a VCF is written to: its own, with .nei in
    place of .vcf, .vcf.gz or .vcf.bgz. */
function neiNameOf(name: string): string {
  return `${name.replace(/\.vcf(?:\.b?gz)?$/iu, "")}.nei`;
}

/** The escapes of Python for the commonest characters a string of it
    escapes. */
const PYTHON_ESCAPES: ReadonlyMap<string, string> = new Map([
  ["\\", "\\\\"],
  ['"', '\\"'],
  ["\n", "\\n"],
  ["\t", "\\t"],
  ["\r", "\\r"],
]);

/** `value` as a string of Python between double quotes, which Python
    reads as the same text: a quote and a backslash escaped, and each
    character the box escapes written as `\uXXXX`, or `\UXXXXXXXX` above
    U+FFFF, so that the line shows what the box shows. */
function pythonString(value: string): string {
  const characters = Array.from(value, (character) => {
    const named = PYTHON_ESCAPES.get(character);
    if (named !== undefined) return named;
    if (!isHidden(character)) return character;
    const code = character.codePointAt(0);
    if (code === undefined) {
      throw new Error("popnei_web defect: a character of a name has no code.");
    }
    return code > 0xffff
      ? `\\U${code.toString(16).padStart(8, "0")}`
      : `\\u${code.toString(16).padStart(4, "0")}`;
  });
  return `"${characters.join("")}"`;
}

/** The name of the lines of popnei's Python in the box, for a screen
    reader. */
export const PYTHON_NAME = "popnei's Python";

/** What the box says of a variants file that could not be opened. */
export interface OpenFailure {
  /** What happened and what to do, which the status region says too. */
  readonly text: string;
  /** popnei's Python that opens the file with its ploidy given and
      writes it as a `.nei` file, after `words`, which say when it helps;
      `code` is its lines, one statement each, drawn apart from the words
      so that they can be copied whole; `null` when no Python helps. */
  readonly remedy: { readonly words: string; readonly code: string } | null;
}

/**
 * What the box says of the variants file of `p` that could not be opened,
 * or `null` for a file being read or read: a VCF whose ploidy popnei
 * could not read, since its first variants hold no genotype with alleles,
 * whose genotypes are missing or that has no genotypes, which popnei does
 * not tell apart, with popnei's Python as the remedy for the first, since
 * the page has no field to give a ploidy; a VCF of no variant; a file cut
 * short or damaged, in the words its count gives; the worker that stopped
 * or met a defect of our code, whose words the error bar shows; otherwise
 * those of `variantsOpenNeeds`.
 */
export function openFailure(p: Project): OpenFailure | null {
  const variants = p.variants;
  if (variants?.read.kind === "failed") {
    const error = variants.read.error;
    const name = escaped(variants.name);
    if (error.kind === "popnei") {
      const message = error.message;
      const notRead = PLOIDY_NOT_READ.exec(message);
      if (notRead !== null) {
        const [which, their] =
          notRead[1] === undefined
            ? ["the one variant", "its"]
            : [`the first ${grouped(Number(notRead[1]))} variants`, "their"];
        return {
          text: `No genotype with alleles was found in ${which} of ${name}: ${their} genotypes are missing, or the file has no genotypes (GT). popnei cannot read the ploidy of the file.`,
          remedy: {
            words:
              "If the genotypes are missing, popnei's Python opens the file with its ploidy given, 2 for a diploid, and writes it as a .nei file, which this page opens:",
            code: [
              "import popnei",
              `variants = popnei.open_vcf(${pythonString(variants.name)}, ploidy=2, only_passed=False)`,
              `popnei.write_vars(variants, ${pythonString(neiNameOf(variants.name))})`,
            ].join("\n"),
          },
        };
      }
      if (message.startsWith(PLOIDY_OF_NO_VARIANTS)) {
        return {
          text: `${name} has no variants. Open another variants file.`,
          remedy: null,
        };
      }
      // With no ploidy, popnei reads the first lines at the opening, up
      // to the first genotype with alleles, so a file cut short can be
      // found here as well as by the count.
      if (
        message.startsWith(SOURCE_UNREADABLE) ||
        message.startsWith(BGZIP_REFUSAL)
      ) {
        return { text: refusalText(message, p), remedy: null };
      }
    } else if (
      error.error.kind === "workerFailed" ||
      error.error.kind === "defect"
    ) {
      // The error bar, on the screen with it, says what the worker said
      // and how to report it (the owner, 6 October 2026).
      return { text: `${name} could not be read.`, remedy: null };
    }
  }
  const text = variantsOpenNeeds(p);
  return text === null ? null : { text, remedy: null };
}

/** The button that counts again after a Stop or a failure. */
export const COUNT_AGAIN_LABEL = "Count again";

/** What the status region says of a count stopped, whose lines then say
    "not counted" beside Count again. */
export const STOPPED_TEXT =
  "Counting the variants was stopped. Count again counts them from the start.";

/** The line of the count: "1,200 variants on 1 chromosome." */
export function countedText(numVars: number, numChroms: number): string {
  return `${counted(numVars, "variant")} on ${counted(numChroms, "chromosome")}.`;
}

/** popnei's refusal of a variant at the position 0. */
const POSITION_ZERO =
  /^a variant of the chromosome (.*?) is at the position 0,/su;

/** popnei's refusal of a window that ends past 2^53, which, with one
    window per chromosome, only a position of 2^53 or more gives. */
const PAST_LARGEST =
  /^the window \d+ to \d+ of the chromosome (.*?) ends past/su;

/**
 * The words of popnei's refusal `message` of the count of the variants
 * of `p`: a file of no variant; a variant at the position 0; a position of
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
    // The page reads every variant, whatever its FILTER column, so a
    // pass of none is a file of none.
    return `${fileName} has no variants. Open another variants file.`;
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
    case "defect":
      // The entry gives what the worker said to the error bar, on the
      // screen with these words, which says what it was and how to report
      // it; Count again is offered beside them after a stop of the worker.
      return `The variants of ${fileName} could not be counted.`;
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

/** What the status region says as a read starts: "Reading
    panel.vcf.gz." The page reads every file in one way, so it names no
    option. */
export function readingText(variants: VariantSource): string {
  return `Reading ${escaped(variants.name)}.`;
}

/** The name of the bar of the count. */
export const COUNT_BAR_LABEL = "Counting the variants";

/** What the page knows of the focus as the store changes. */
export interface FocusNow {
  /** Whether the focus is on Stop or Count again of the count, which,
      when the count ends with no button to show, moves the focus onto
      its lines or the words of its failure, for a screen reader to read
      them. */
  readonly focusOnCountButton: boolean;
}

/**
 * What the status region says of a change of the store from `before` to
 * `after`, which the user may not be looking at: the file read, with its
 * individuals, or why it was not; and the count done, with its numbers,
 * or why it failed. The end of a count that moves the focus onto its own
 * words, `focus` says, is not said again.
 */
export function announcementsOf(
  before: AppState<JobResult, unknown>,
  after: AppState<JobResult, unknown>,
  focus: FocusNow = { focusOnCountButton: false },
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
    // The words alone: the lines of Python are read in the box.
    const failure = openFailure(after.project);
    if (failure !== null) texts.push(failure.text);
  }
  const then = summaryStatus(before);
  const now = summaryStatus(after);
  // The button goes with the focus at a count done and at a failure
  // Count again cannot mend, and the focus moves onto those words.
  const focusMoves =
    focus.focusOnCountButton &&
    (now.kind === "done" ||
      (now.kind === "error" && !countAgainMends(now.error)));
  if (focusMoves) return texts;
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
