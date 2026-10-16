/**
 * The words of popnei's refusals of the variants file itself on
 * popgen2.html, which the one pass of the page meets first and the box
 * Variants file words, and which a calculation after it, the PCA, may
 * meet again: a file of no variant; a file that could not be read to its
 * end, a gzipped file cut short or a `.nei` file with a batch damaged; a
 * variant at the position 0; a position of 2^53 or more; a genotype of
 * another ploidy; any other line of the VCF popnei cannot read, or a
 * bgzipped file cut short. One place for the patterns and the words, so
 * that the box and the PCA say the same of the same file, each with its
 * own end (docs/specs/steps/popgen2-pca.md, "Its words").
 */

import {
  EMPTY_SOURCE,
  SOURCE_UNREADABLE,
  VARS_BATCH_UNREADABLE,
  defect,
  isVcfLineRefusal,
} from "./words.ts";
import { escaped, saying, shown, withoutBackquotes } from "../project.ts";
import type { Project } from "../project.ts";

/** popnei's refusal of a variant at the position 0. */
const POSITION_ZERO =
  /^a variant of the chromosome (.*?) is at the position 0,/su;

/** popnei's refusal of a window that ends past 2^53, which, with one
    window per chromosome, only a position of 2^53 or more gives. */
const PAST_LARGEST =
  /^the window \d+ to \d+ of the chromosome (.*?) ends past/su;

/** popnei's refusal of a genotype of a ploidy other than that the
    variants are read with, "line 9 of the VCF, the column of s000: its
    genotype is of the ploidy 1 and the variants are read with the ploidy
    2; ...", as js-v0.2.1 gives it: the line, and the two ploidies. */
const OTHER_PLOIDY =
  /^line (\d+) of the VCF, .*?its genotype is of the ploidy (\d+) and the variants are read with the ploidy (\d+)/su;

/** What the words of a refusal of the variants file say of the place
    they are read in. */
export interface FileRefusalPlace {
  /** What the refusal leaves undone, after "so": "the variants cannot be
      counted, nor their statistics calculated", "the PCA cannot be
      calculated". */
  readonly cannot: string;
  /** Where and how the file is opened again, after "open it again" and
      "Open another file", with its leading space: " in the Variants tab"
      in the tabs of the analyses, and in the box Variants, which has no
      button once a file is open, the button at the end of that tab,
      " with Open another variants file… in the Variants tab". */
  readonly where: string;
}

/**
 * The words of popnei's refusal `message` of the variants file of `p`,
 * with the place `place`, or `null` for a refusal of another kind. Each
 * says what was found in the file and a remedy that mends it: opening
 * another file, fetching it again, or correcting it and opening it again;
 * never a change of the settings, which a damaged file does not mend.
 * Throws a defect on a project with no variants file.
 */
export function fileRefusalText(
  message: string,
  p: Project,
  place: FileRefusalPlace,
): string | null {
  const variants = p.variants;
  if (variants === null) {
    throw defect(
      "a refusal of the variants file was given a project with no variants file.",
    );
  }
  const fileName = escaped(variants.name);
  const { cannot, where } = place;
  if (message.startsWith(EMPTY_SOURCE)) {
    // The page reads every variant, whatever its FILTER column, so a
    // pass of none is a file of none.
    return `${fileName} has no variants. Open another file${where}.`;
  }
  if (
    message.startsWith(SOURCE_UNREADABLE) ||
    VARS_BATCH_UNREADABLE.test(message)
  ) {
    return `${fileName} could not be read to its end: it may be damaged or cut short. Fetch or copy it again, and open it again${where}.`;
  }
  const zero = POSITION_ZERO.exec(message);
  if (zero !== null) {
    return `A variant of chromosome ${shown(zero[1] ?? "")} in ${fileName} is at position 0, where the VCF format puts a telomere and not a variant, so ${cannot}. Remove that line from the file and open it again${where}.`;
  }
  const past = PAST_LARGEST.exec(message);
  if (past !== null) {
    return `A variant of chromosome ${shown(past[1] ?? "")} in ${fileName} is at a position beyond 2,147,483,647, the largest the VCF format allows, so ${cannot}. Correct the position in the file and open it again${where}.`;
  }
  const ploidies = OTHER_PLOIDY.exec(message);
  if (ploidies !== null) {
    const [, line = "", found = "", read = ""] = ploidies;
    return `Line ${line} of ${fileName} has a genotype of ploidy ${found} among genotypes of ploidy ${read}, and the application reads one ploidy per file. Remove those variants or individuals from the file and open it again${where}.`;
  }
  if (isVcfLineRefusal(message)) {
    return `popnei could not read ${fileName}${saying(withoutBackquotes(message))}. Correct the file, or fetch it again, and open it again${where}.`;
  }
  return null;
}

/**
 * The words of popnei's refusal `message` of the one pass of popgen2.html
 * over the variants file of `p`, with the place `place`: those of the
 * variants file itself, `fileRefusalText`, or, for any other, popnei's
 * message and to open the file again, or another. Throws a defect on a
 * project with no variants file.
 */
export function passRefusalText(
  message: string,
  p: Project,
  place: FileRefusalPlace,
): string {
  const ofFile = fileRefusalText(message, p, place);
  if (ofFile !== null) {
    return ofFile;
  }
  const fileName = escaped(p.variants?.name ?? "");
  return `popnei could not read ${fileName}${saying(withoutBackquotes(message))}. Open the file again${place.where}, or another file.`;
}
