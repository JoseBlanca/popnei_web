/**
 * The words of the Variants step and the rules they rest on
 * (docs/specs/steps/variants.md): the format a name tells, the options a
 * VCF is read with, and the lines of the card. Pure, so that a test in
 * node checks them; the step draws them.
 */

import { DEFAULT_ONLY_PASSED, DEFAULT_PLOIDY } from "../../../core/apps.ts";
import { counted, escaped, grouped } from "../../../core/project.ts";
import type { Project, VariantSource } from "../../../core/project.ts";
import type { VcfReadOptions } from "../../../worker/protocol.ts";
import { numberText } from "../../widgets/committedNumber.ts";
import type { NumberRefusal } from "../../widgets/committedNumber.ts";

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

/** What the step says when several files are dropped at once, or
    several things of which one is not a file. */
export const SEVERAL_DROPPED = "Drop one variants file at a time.";

/** What the step says when a folder is dropped. */
export const FOLDER_DROPPED = "Drop a VCF or a .nei file, not a folder.";

/** What the step says when a piece of text is dropped, dragged from
    another window. */
export const TEXT_DROPPED = "Drop a VCF or a .nei file, not a piece of text.";

/** The line under the ploidy, which the owner asked for on 25 September
    2026 and reworded the same day. */
export const PLOIDY_DESCRIPTION =
  "A VCF does not say its ploidy, so it is given here. If it is wrong, the first analysis stops with a message that names the line and the individual; set the right ploidy here and read the file again.";

/** The label of the ploidy, with its range. */
export const PLOIDY_LABEL = "Ploidy of the VCF, from 1 to 255";

/** The label of the threshold of missing data, with its range. */
export const THRESHOLD_LABEL =
  "Maximum proportion of missing genotypes, from 0 to 1";

/** The number of decimals in words, as a refusal says it. */
const DECIMAL_WORDS = ["no", "one", "two", "three"] as const;

/** Why a number was refused: "10 is more than 1", "0.125 has more than
    two decimals", "2.5 is not a whole number". */
function refusedWhy(refusal: NumberRefusal): string {
  const typed = numberText(refusal.typed);
  switch (refusal.kind) {
    case "aboveMax":
      return `${typed} is more than ${numberText(refusal.maxValue)}`;
    case "belowMin":
      return `${typed} is less than ${numberText(refusal.minValue)}`;
    case "offStep": {
      if (refusal.decimals === 0) return `${typed} is not a whole number`;
      const count = DECIMAL_WORDS[refusal.decimals] ?? String(refusal.decimals);
      const noun = refusal.decimals === 1 ? "decimal" : "decimals";
      return `${typed} has more than ${count} ${noun}`;
    }
  }
}

/** The line under the threshold for a number it refused, with the
    threshold kept: "10 is more than 1; the filter keeps 0.1.", as the
    owner decided on 25 September 2026. */
export function thresholdRefusedText(
  refusal: NumberRefusal,
  kept: number,
): string {
  return `${refusedWhy(refusal)}; the filter keeps ${numberText(kept)}.`;
}

/** The line under the ploidy for a number it refused, with the ploidy
    kept: "300 is more than 255; the ploidy stays 2." */
export function ploidyRefusedText(
  refusal: NumberRefusal,
  kept: number,
): string {
  return `${refusedWhy(refusal)}; the ploidy stays ${numberText(kept)}.`;
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

/** A size of a file in bytes, as the card shows it: "812 bytes", "45.3
    kB", "1.2 MB", "3.4 GB", in units of 1000, as the file managers of
    macOS and of most Linux desktops show them. */
export function sizeText(bytes: number): string {
  if (bytes < 1000) return bytes === 1 ? "1 byte" : `${grouped(bytes)} bytes`;
  const units = ["kB", "MB", "GB", "TB"] as const;
  let value = bytes / 1000;
  for (const unit of units) {
    if (value < 999.95 || unit === "TB") {
      return `${value.toFixed(1)} ${unit}`;
    }
    value /= 1000;
  }
  throw new Error("popnei_web defect: sizeText went past its last unit.");
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
