/**
 * What the analyses share: the words of a refusal of popnei, which the
 * diversity and the three analyses of the Variants step give their error
 * states from; the parsing of the options of an analysis that has none;
 * the description of a histogram with the threshold of its filter; and
 * the cells of a CSV (docs/specs/analyses/diversity.md, "Its words";
 * individualChecks.md, "Its words"; variantChecks.md, "The states";
 * filterCounts.md, "The states"; docs/specs/charts/histogram.md, "The
 * numbers without the picture").
 */

import type { JsonObject } from "../keys.ts";
import { counted, escaped, saying, shown } from "../project.ts";
import type { Project } from "../project.ts";
import type { Result } from "../result.ts";

/** The start of popnei's refusal of a pass over a source that holds no
    variant, whatever the filters. */
const EMPTY_SOURCE = "the pass gave no variant and its source holds none";

/** The start of popnei's refusal of a pass that gave no variant from a
    source that held some: with its colon, which the refusal of a source
    that holds none does not have at that place, so that neither is taken
    for the other. */
const EMPTY_PASS = "the pass gave no variant:";

/** The words of the box of the Variants step that reads only the
    variants that passed, as its label says them. */
export const ONLY_PASSED_BOX =
  "Only the variants with PASS or . in the FILTER column";

/** popnei's refusal of a genotype of another ploidy than the one the VCF
    was read with: the line, the individual, the ploidy found and the one
    given. */
const OTHER_PLOIDY =
  /^line (\d+) of the VCF, the column of (.*?): its genotype is of the ploidy (\d+) and the reader was asked for the ploidy (\d+)/su;

/** The start of popnei's refusals of a gzipped VCF damaged or cut
    short. */
const BGZIP_REFUSAL = "the VCF was written by bgzip";

/** What the words of a refusal say of the calculation refused. */
export interface RefusalWords {
  /** What was calculated, after "no variant to" and "popnei could not":
      "calculate the statistics of each individual". */
  readonly calculate: string;
  /** How to try again, the end of the last row: "to calculate them
      again". */
  readonly again: string;
  /** The whole text of an empty pass, given the name of the variants file
      escaped; `null` for a calculation whose pass has no filter, whose
      empty pass then gets the words of any other refusal. */
  readonly emptyPass: ((fileName: string) => string) | null;
}

/**
 * The words of a refusal of popnei, for the error state of a panel of the
 * project `p`, by the start of popnei's message, as the diversity's table
 * of "Its words" has them with the calculation's own words: the variants
 * file holds no variant, or, for a VCF read with only the passed variants,
 * none that passed; the filters kept none, when `words.emptyPass` is
 * given; a genotype of another ploidy than the one the VCF was read with;
 * a line of the VCF popnei cannot read, or a gzipped file damaged or cut
 * short; any other, with popnei's message without its full stop. Throws a
 * defect on a project with no variants file.
 */
export function refusalWords(
  message: string,
  p: Project,
  words: RefusalWords,
): string {
  if (p.variants === null) {
    throw defect("a refusal was given a project with no variants file.");
  }
  const fileName = escaped(p.variants.name);
  if (message.startsWith(EMPTY_SOURCE)) {
    return emptySourceText(p, `there is no variant to ${words.calculate} over`);
  }
  if (words.emptyPass !== null && message.startsWith(EMPTY_PASS)) {
    return words.emptyPass(fileName);
  }
  const ploidy = otherPloidyText(message, p);
  if (ploidy !== null) {
    return ploidy;
  }
  const isVcfLine =
    /^line \d+ of the VCF/u.test(message) || message.startsWith(BGZIP_REFUSAL);
  if (isVcfLine) {
    return `popnei could not read ${fileName}${saying(message)}. Correct the file, or fetch it again, and load it in the Variants step.`;
  }
  return `popnei could not ${words.calculate}${saying(message)}. Change the settings, or load the variants file again, ${words.again}.`;
}

/**
 * The words of a variants file of `p` that holds no variant, or, for a VCF
 * read with only the passed variants, none that passed, with what that
 * leaves, `consequence`, after "so": "there is no variant to calculate the
 * diversity over", "there is nothing to write". Throws a defect on a
 * project with no variants file.
 */
export function emptySourceText(p: Project, consequence: string): string {
  if (p.variants === null) {
    throw defect("an empty source was given a project with no variants file.");
  }
  const fileName = escaped(p.variants.name);
  if (p.variants.readOptions?.onlyPassed === true) {
    return `${fileName} has no variant with PASS or . in its FILTER column, and it was read with only those, so ${consequence}. Untick "${ONLY_PASSED_BOX}" in the Variants step and read the file again.`;
  }
  return `${fileName} has no variants, so ${consequence}. Load another variants file in the Variants step.`;
}

/**
 * The words of popnei's refusal `message` of a genotype of another ploidy
 * than the one the VCF of `p` was read with, or `null` for another
 * message. Throws a defect on a project with no variants file.
 */
export function otherPloidyText(message: string, p: Project): string | null {
  if (p.variants === null) {
    throw defect("a refusal was given a project with no variants file.");
  }
  const ploidy = OTHER_PLOIDY.exec(message);
  if (ploidy === null) {
    return null;
  }
  const fileName = escaped(p.variants.name);
  const [, line = "", individual = "", found = "", given = ""] = ploidy;
  const alleles = counted(Number(found), "allele");
  return `At line ${line} of ${fileName}, the genotype of ${shown(individual)} has ${alleles}, and the file was read with ploidy ${given}. If every genotype of the file has ${alleles}, set the ploidy of the VCF to ${found} in the Variants step and read the file again. A file that mixes ploidies, such as one with the X of males haploid among diploid autosomes, cannot be read in this version.`;
}

/**
 * One bin of a histogram as its description reads it: the rows that
 * `histogramRows` of src/charts/histogram.ts gives, which the screen
 * passes on, so that the description, the table and the plot read the
 * state of each bin from one rule.
 */
export interface DescribedBin {
  /** The lower edge. */
  readonly from: number;
  /** The upper edge. */
  readonly to: number;
  /** The values in the bin. */
  readonly count: number;
  /** What the threshold does to the bin, `null` when there is none. */
  readonly state: "kept" | "partlyKept" | "removed" | null;
}

/**
 * The description of a histogram, the summary its text alternative
 * gives: what is counted and how many, the bins and their range, and,
 * with a threshold, the bins it keeps, the bin it splits and the bins it
 * removes, each with the values in them, a part with no bin left out and
 * "keeps none of the bins" when it keeps none. "The major allele
 * frequency of 1,200 variants, in 40 bins from 0 to 1. The threshold 0.95
 * keeps the 38 bins up to it, 1,175 variants, and removes the 2 bins
 * above it, 25 variants." The edges and the threshold are written to four
 * decimals at most, with no zero at the end. `subject` starts the
 * sentence, "The major allele frequency"; `noun` is what is counted, in
 * the singular, "variant". Throws a defect when there is no bin, when a
 * bin has a state and there is no threshold or the other way round, and
 * when more than one bin is split.
 */
export function histogramDescription(
  subject: string,
  noun: string,
  bins: readonly DescribedBin[],
  threshold: number | null,
): string {
  const first = bins.at(0);
  const last = bins.at(-1);
  if (first === undefined || last === undefined) {
    throw defect("a histogram with no bin to describe.");
  }
  const total = bins.reduce((sum, bin) => sum + bin.count, 0);
  const opening = `${subject} of ${counted(total, noun)}, in ${counted(bins.length, "bin")} from ${decimals(first.from)} to ${decimals(last.to)}.`;
  if (threshold === null) {
    if (bins.some((bin) => bin.state !== null)) {
      throw defect("a bin of a histogram has a state and no threshold.");
    }
    return opening;
  }
  const kept = bins.filter((bin) => bin.state === "kept");
  const split = bins.filter((bin) => bin.state === "partlyKept");
  const removed = bins.filter((bin) => bin.state === "removed");
  if (kept.length + split.length + removed.length !== bins.length) {
    throw defect("a bin of a histogram with a threshold has no state.");
  }
  if (split.length > 1) {
    throw defect("a threshold splits more than one bin of a histogram.");
  }
  const parts = [
    kept.length === 0
      ? "keeps none of the bins"
      : `keeps ${theBins(kept.length)} up to it, ${countedIn(kept, noun)}`,
    ...split.map(
      (bin) =>
        `splits the bin from ${decimals(bin.from)} to ${decimals(bin.to)}, ${counted(bin.count, noun)}`,
    ),
    ...(removed.length === 0
      ? []
      : [
          `removes ${theBins(removed.length)} above it, ${countedIn(removed, noun)}`,
        ]),
  ];
  return `${opening} The threshold ${decimals(threshold)} ${listed(parts)}.`;
}

/** "the bin" for one, "the 38 bins" for more. */
function theBins(count: number): string {
  return count === 1 ? "the bin" : `the ${counted(count, "bin")}`;
}

/** The values in some bins, with their noun: "1,175 variants". */
function countedIn(bins: readonly DescribedBin[], noun: string): string {
  return counted(
    bins.reduce((sum, bin) => sum + bin.count, 0),
    noun,
  );
}

/** Parts of a sentence, each but the first a clause of its own with a
    count in it, so the last comes after ", and ": "a, and b"; one alone
    as it is. */
function listed(parts: readonly string[]): string {
  const last = parts.at(-1) ?? "";
  return parts.length < 2
    ? last
    : `${parts.slice(0, -1).join(", ")}, and ${last}`;
}

/** A number of the description, to four decimals at most with no zero at
    the end: 0.016493055555555556 is "0.0165", 0.5 is "0.5". */
function decimals(value: number): string {
  return String(Number(value.toFixed(4)));
}

/** A number of a result in a CSV: as `String` writes it, or an empty cell
    for no value. */
export function csvNumber(value: number | null): string {
  return value === null ? "" : String(value);
}

/** A field of a CSV, quoted when it holds a comma, a quote or a new line,
    its quotes doubled, as RFC 4180 has it. */
export function csvField(value: string): string {
  return /[",\n\r]/u.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/** A number of popnei, `null` for a NaN. */
export function orNull(value: number): number | null {
  return Number.isNaN(value) ? null : value;
}

/** What the options of an analysis that has none should be, the end of
    "‹the field› should be ‹…›" of `projectErrorText`. */
const NO_OPTION = "no option";

/** The `parseOptions` of an analysis that has no option: gives back `{}`
    for `{}`, and refuses anything else with "no option". */
export function parseNoOptions(options: unknown): Result<JsonObject, string> {
  const isEmpty =
    typeof options === "object" &&
    options !== null &&
    !Array.isArray(options) &&
    Reflect.ownKeys(options).length === 0;
  return isEmpty ? { ok: true, value: {} } : { ok: false, error: NO_OPTION };
}

/** An error for a state the code makes impossible. */
export function defect(message: string): Error {
  return new Error(`popnei_web defect: ${message}`);
}
