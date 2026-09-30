/**
 * The words of the Variants step and the rules they rest on
 * (docs/specs/steps/variants.md): the format a name tells, the options a
 * VCF is read with, the lines of the card, and the words of the rest
 * of the application with "in the Variants step" taken out. Pure, so that a test in
 * node checks them; the step draws them.
 */

import { DEFAULT_ONLY_PASSED, DEFAULT_PLOIDY } from "../../../core/apps.ts";
import { counted, escaped, grouped } from "../../../core/project.ts";
import type { Project, VariantSource } from "../../../core/project.ts";
import type { VcfReadOptions } from "../../../worker/protocol.ts";
import type { ButtonOf } from "../../analyses/status.ts";
import { refusedWhy } from "../../analyses/words.ts";
import type { NotTakenWords } from "../../analyses/words.ts";
import { numberText } from "../../widgets/committedNumber.ts";
import type { NumberRefusal } from "../../widgets/committedNumber.ts";

/** " in the Variants step", and the comma before it, where it ends a
    sentence or comes before "and": the end that the words of a failure
    have elsewhere in the application, and that the step, which is the
    Variants step, leaves out, as the owner decided at stop A. */
const IN_THE_STEP = /,? in the Variants step(?=\.| and )/gu;

/** `text` with "in the Variants step" taken out, as the step shows the
    words it takes from the store and from the other parts of the
    application: "Load another variants file in the Variants step."
    becomes "Load another variants file.", and "Change the list, or
    remove the filter, in the Variants step." becomes "Change the list,
    or remove the filter." (writeVariants.md, "Its words"). */
export function withoutTheStep(text: string): string {
  return text.replace(IN_THE_STEP, "");
}

/** The short line beside the disabled Count and Write while the LD
    pruning has no distance, in the place of its reason, which stands
    whole under the field of the distance (variants.md, "Its words";
    stop A 2, decided by the owner on 29 September 2026). */
export const LD_LOCKED_LINE =
  "Locked until the distance of the LD pruning is typed, above.";

/** The text beside a button of the step locked with `reason`: the short
    line of the LD pruning when `reason` is `ldReason`, the reason of the
    LD pruning with no distance that `variantFilterNeeds` gives the
    project, or `null` when it gives none; any other reason without "in
    the Variants step". */
export function lockedInTheStep(
  reason: string,
  ldReason: string | null,
): string {
  return reason === ldReason ? LD_LOCKED_LINE : withoutTheStep(reason);
}

/** The button of a check of the step, `button`, with the reason of a
    disabled Calculate or Count as the step shows it beside the button,
    `lockedInTheStep` of it with `ldReason` (variants.md, "Its words"). */
export function buttonInTheStep(
  button: ButtonOf,
  ldReason: string | null,
): ButtonOf {
  return button?.kind === "run" && button.reason !== null
    ? { kind: "run", reason: lockedInTheStep(button.reason, ldReason) }
    : button;
}

/** The options of a VCF with nothing loaded and no reference. */
export const DEFAULT_READ_OPTIONS: VcfReadOptions = Object.freeze({
  ploidy: DEFAULT_PLOIDY,
  onlyPassed: DEFAULT_ONLY_PASSED,
});

/** The endings the file picker offers first; any file is under "All
    files". A browser matches the last dot of a name, so `.gz` stands for
    `.vcf.gz`. */
export const PICKER_ENDINGS: readonly string[] = Object.freeze([
  ".vcf",
  ".gz",
  ".bgz",
  ".nei",
]);

/** The endings of a VCF, plain or compressed, which popnei's `openVcf`
    reads alike. */
const VCF_ENDINGS = [".vcf", ".vcf.gz", ".vcf.bgz"] as const;

/** The format the end of `name` tells, compared without regard to case,
    or `null` for a name of any other ending, which is not loaded. */
export function formatOfName(name: string): "vcf" | "nei" | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".nei")) return "nei";
  return VCF_ENDINGS.some((ending) => lower.endsWith(ending)) ? "vcf" : null;
}

/** What the step says of a file of another name, which it did not load. */
export function notLoadedText(name: string): string {
  return `${escaped(name)} was not loaded: the Variants step reads a VCF, whose name ends in .vcf, .vcf.gz or .vcf.bgz, or a .nei file. If it is one of them, rename it.`;
}

/** What the step says when several files are dropped or pasted at once,
    or several things of which one is not a file. A paste is a drop to
    the step, and a user of the keyboard pastes and cannot drop, so the
    words say "load". */
export const SEVERAL_DROPPED = "Load one variants file at a time.";

/** What the step says when a folder is dropped or pasted. */
export const FOLDER_DROPPED = "Load a VCF or a .nei file, not a folder.";

/** What the step says when a piece of text is dropped, dragged from
    another window, or pasted. */
export const TEXT_DROPPED = "Load a VCF or a .nei file, not a piece of text.";

/** The line under the ploidy, which the owner asked for on 25 September
    2026 and reworded the same day. */
export const PLOIDY_DESCRIPTION =
  "A VCF does not say its ploidy, so it is given here. If it is wrong, the first analysis stops with a message that names the line and the individual; set the right ploidy here and read the file again.";

/** The label of the ploidy, with its range. */
export const PLOIDY_LABEL = "Ploidy of the VCF, from 1 to 255";

/** The heading of the section of the filters of the variants. */
export const FILTERS_HEADING = "Filters of the variants";

/** The line under that heading, in place of the checks and the Count,
    while the variants file is not read (docs/specs/steps/variants.md,
    "The parts, in their order"). */
export const NOT_READ_LINE =
  "The histograms, the counts and the statistics of each individual are calculated once a variants file is read.";

/** The switch of the missing data filter. */
export const MISSING_DATA_SWITCH = "Filter the variants by missing data";

/** The label of the threshold of missing data, with its range. */
export const THRESHOLD_LABEL =
  "Maximum proportion of missing genotypes, from 0 to 1";

/** The line under the switch of the missing data filter: what popnei
    counts as missing, and over which individuals, those the filters of
    individuals keep, which act first. */
export const MISSING_DATA_LINE =
  "A genotype is missing when any of its alleles is, 0/. among them; the proportion is over the individuals the filters of individuals keep.";

/** The switch of the filter by observed heterozygosity. */
export const OBS_HET_SWITCH = "Filter the variants by observed heterozygosity";

/** The label of its threshold, with its range. */
export const OBS_HET_LABEL = "Maximum observed heterozygosity, from 0 to 1";

/** The line under the switch of the filter by observed heterozygosity,
    as the owner chose it on 27 September 2026: what the statistic
    counts, and why a variant is removed for it. */
export const OBS_HET_LINE =
  "The proportion of the individuals with a called genotype that are heterozygous; a high one often marks duplicated regions read as one.";

/** The switch of the MAF filter. */
export const MAF_SWITCH = "Filter the variants by major allele frequency (MAF)";

/** The label of its threshold, with its range. */
export const MAF_LABEL = "Maximum major allele frequency, from 0 to 1";

/** The line under the switch of the MAF filter: the MAF is the major
    allele frequency, as the owner decided on 24 September 2026, and a
    user who reads it as the minor one would set 0.05 and keep almost
    nothing. */
export const MAF_LINE =
  "The frequency of the commonest allele: 0.95 removes a variant whose commonest allele is above 0.95. For a variant of two alleles, that is a minor allele frequency below 0.05.";

/** The switch of the LD pruning. */
export const LD_SWITCH = "Prune the variants by linkage disequilibrium (LD)";

/** The label of its r², with its range. */
export const R2_LABEL = "Maximum r² with a variant kept before it, from 0 to 1";

/** The label of its distance, with its range. */
export const DISTANCE_LABEL =
  "Distance within which variants are compared, in base pairs, from 1";

/** The line under the switch of the LD pruning: popnei's `filterByLd`
    keeps the variant that comes first. */
export const LD_LINE =
  "Of two variants closer than the distance, and with an r² above the maximum, the first is kept.";

/** What the threshold says of a character it threw away. */
const THRESHOLD_NOT_TAKEN: NotTakenWords = Object.freeze({
  comma: "Write the decimals with a point, 0.1 and not 0,1",
  other:
    "cannot be typed in the threshold, which is written with digits and a point, as 0.05",
});

/** What the ploidy says of a character it threw away. */
const PLOIDY_NOT_TAKEN: NotTakenWords = Object.freeze({
  comma: "Write the ploidy as a whole number, 4 and not 4,0",
  other: "cannot be typed in the ploidy, which is a whole number, as 4",
});

/** What the maximum r² says of a character it threw away: the words of
    the threshold, with the noun of the field. */
const R2_NOT_TAKEN: NotTakenWords = Object.freeze({
  comma: THRESHOLD_NOT_TAKEN.comma,
  other:
    "cannot be typed in the maximum r², which is written with digits and a point, as 0.05",
});

/** What the distance says of a character it threw away. */
const DISTANCE_NOT_TAKEN: NotTakenWords = Object.freeze({
  comma:
    "Write the distance as a whole number of base pairs, 10000 and not 10,000",
  other:
    "cannot be typed in the distance, which is a whole number of base pairs, as 10000",
});

/** The line under the threshold for a number it refused, or a character
    it threw away, with the threshold kept: "10 is more than 1; the
    threshold stays 0.1.", "Write the decimals with a point, 0.1 and not
    0,1; the threshold stays 0.1." */
export function thresholdRefusedText(
  refusal: NumberRefusal,
  kept: number,
): string {
  return `${refusedWhy(refusal, THRESHOLD_NOT_TAKEN)}; the threshold stays ${numberText(kept)}.`;
}

/** The line under the maximum r² of the LD pruning for a number it
    refused, or a character it threw away, with the r² kept: "1.5 is more
    than 1; the maximum r² stays 0.3." */
export function r2RefusedText(refusal: NumberRefusal, kept: number): string {
  return `${refusedWhy(refusal, R2_NOT_TAKEN)}; the maximum r² stays ${numberText(kept)}.`;
}

/** The line under the distance of the LD pruning for a number it
    refused, or a character it threw away, with the distance kept: "0 is
    less than 1; the distance stays 50000."; or, while the field is empty
    and `kept` is `NaN`, "0 is less than 1; the distance is still to be
    typed." */
export function distanceRefusedText(
  refusal: NumberRefusal,
  kept: number,
): string {
  const why = refusedWhy(refusal, DISTANCE_NOT_TAKEN);
  return Number.isNaN(kept)
    ? `${why}; the distance is still to be typed.`
    : `${why}; the distance stays ${numberText(kept)}.`;
}

/** The line under the ploidy for a number it refused, or a character it
    threw away, with the ploidy kept: "300 is more than 255; the ploidy
    stays 2." */
export function ploidyRefusedText(
  refusal: NumberRefusal,
  kept: number,
): string {
  return `${refusedWhy(refusal, PLOIDY_NOT_TAKEN)}; the ploidy stays ${numberText(kept)}.`;
}

/** The format of a loaded file, as the card names it. */
export function formatText(format: VariantSource["format"]): string {
  switch (format) {
    case "vcf":
      return "VCF";
    case "nei":
      return ".nei file";
  }
}

/** The line of the individuals of a read file: "200 individuals". */
export function individualsText(numIndividuals: number): string {
  return counted(numIndividuals, "individual");
}

/** The line of the ploidy of a read `.nei` file: "Ploidy 2". */
export function ploidyText(ploidy: number): string {
  return `Ploidy ${String(ploidy)}`;
}

/** The line of the variants of a read file: "1,200 variants", or, until
    a pass has counted them, what counts them. */
export function variantsText(numVars: number | null): string {
  return numVars === null
    ? "Variants: not counted yet; the first analysis that reads the whole file counts them"
    : counted(numVars, "variant");
}

/**
 * The line of the total under the filters of the variants, once they are
 * counted for the filters as they are (docs/specs/steps/variants.md, "What
 * each filter of the variants kept"): "1,128 of the 1,200 variants of
 * panel.nei pass the filters.", or with no filter of the variants "1,200
 * variants in panel.nei, with no filter."; `null` while the variants of
 * the file are not counted. The shell announces it at the end of a Count.
 */
export function filtersTotalText(
  p: Project,
  numVarsKept: number,
): string | null {
  const read = p.variants?.read;
  if (p.variants === null || read?.kind !== "read" || read.numVars === null) {
    return null;
  }
  const name = escaped(p.variants.name);
  if (p.filters.length === 0) {
    return `${counted(read.numVars, "variant")} in ${name}, with no filter.`;
  }
  const verb = numVarsKept === 1 ? "passes" : "pass";
  return `${grouped(numVarsKept)} of the ${grouped(read.numVars)} variants of ${name} ${verb} the filters.`;
}

/** The words of the Count button (docs/specs/analyses/filterCounts.md,
    "The Count button"). */
export const COUNT_LABEL = "Count the variants each filter keeps";

/** The counts of the filters in the middle of a sentence, which also
    names the bar of their calculation. */
export const COUNT_NAME = "the counts of the filters";

/** The sentence that asks for the Count again after a failure
    (filterCounts.md, "The states", error). */
export const COUNT_AGAIN = "Count again.";

/** The line in place of the line of the total while the filters as they
    are have no counts. */
export const NOT_COUNTED_LINE =
  "Not counted for these filters. Count to see what each filter keeps.";

/** What one filter of the variants kept, beside it: "Kept 1,152 of the
    1,200 variants it was given.", "Kept 1 of the 1 variant it was
    given." */
export function keptText(given: number, kept: number): string {
  return `Kept ${grouped(kept)} of the ${counted(given, "variant")} it was given.`;
}

/** The words of the passed variants: "only the variants with PASS or .
    in the FILTER column", or "every variant". */
function passedWords(onlyPassed: boolean): string {
  return onlyPassed
    ? "only the variants with PASS or . in the FILTER column"
    : "every variant";
}

/** The line of how a VCF was read: "Read with ploidy 2, every variant". */
export function readWithText(options: VcfReadOptions): string {
  return `Read with ploidy ${String(options.ploidy)}, ${passedWords(options.onlyPassed)}`;
}

/** The label of the check box of the passed variants. */
export const ONLY_PASSED_LABEL =
  "Only the variants with PASS or . in the FILTER column";

/**
 * The label of the button that reads the loaded VCF `name` again with the
 * options `chosen`, or `null` when they are those it was read with,
 * `loaded`: every option that differs, the ploidy first, as the owner
 * decided on 25 September 2026, "Read panel.vcf.gz again with ploidy 4
 * and every variant".
 */
export function readAgainLabel(
  name: string,
  loaded: VcfReadOptions,
  chosen: VcfReadOptions,
): string | null {
  const changes: string[] = [];
  if (chosen.ploidy !== loaded.ploidy) {
    changes.push(`ploidy ${String(chosen.ploidy)}`);
  }
  if (chosen.onlyPassed !== loaded.onlyPassed) {
    changes.push(passedWords(chosen.onlyPassed));
  }
  if (changes.length === 0) return null;
  return `Read ${escaped(name)} again with ${changes.join(" and ")}`;
}

/**
 * The options of a VCF the step starts at: those of the VCF loaded; in a
 * project opened from a file with no variants file yet, those of the
 * reference's VCF; otherwise the defaults.
 */
export function startingOptions(p: Project): VcfReadOptions {
  const loaded = p.variants?.readOptions ?? null;
  if (loaded !== null) return loaded;
  if (p.variants === null) {
    const referred = p.reference?.variants.readOptions ?? null;
    if (referred !== null) return referred;
  }
  return DEFAULT_READ_OPTIONS;
}

/** The seconds a read has taken, as the step shows them after "Reading
    panel.nei.": "1 second so far.", "12 seconds so far."; nothing before
    the first second. */
export function elapsedText(seconds: number): string {
  if (seconds < 1) return "";
  return `${counted(seconds, "second")} so far.`;
}
