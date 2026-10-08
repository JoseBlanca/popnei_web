/**
 * The words of the download of the filtered variants on popgen2.html
 * (docs/specs/steps/popgen2-download.md, "Its words";
 * docs/specs/analyses/writeVariants.md, "Its words on popgen2.html"): the
 * button and the reasons it waits, the dialog, its line and bar of the
 * write, what the status region says after a Stop, the failures of the
 * write, the text after the download with what each filter removed, and
 * the sentence of no variant kept. Pure, so that a test in node checks
 * them; `DownloadVariants.tsx` draws them.
 */

import { escaped, counted, grouped } from "../../core/project.ts";
import type { Project } from "../../core/project.ts";
import type { IndividualsKept } from "../../core/individualsKept.ts";
import { VARIANT_FILTER_ORDER } from "../../core/project.ts";
import type { AnalysisError } from "../../core/store.ts";
import { sizeText } from "../../core/writeEstimate.ts";
import type {
  IndividualFilterKind,
  PassStats,
  VariantFilterKind,
} from "../../worker/protocol.ts";
import type { WriteFormat } from "../../core/keys.ts";
import { clockText } from "../analyses/words.ts";
import { failedText } from "./words.ts";

/** The words of the button, whose three dots say that it opens a
    dialog. */
export const DOWNLOAD_LABEL = "Download filtered variants…";

/** Why the button is disabled while the file is opened, while the one
    pass runs, and after its Stop. */
export const DOWNLOAD_WAITS =
  "The download waits for the statistics of the file to be read to the end.";

/** Why the button is disabled after a failure of the opening or of the
    one pass, whose words the box of the file says. */
export const DOWNLOAD_NEEDS =
  "The download needs the statistics of the file, which could not be calculated.";

/** The heading of the dialog, which is also its name. */
export const DIALOG_HEADING = "Download filtered variants";

/** The name of the group of the format. */
export const FORMAT_LABEL = "Format";

/** The two formats the dialog offers, the VCF first, since most programs
    read it. */
export const FORMAT_ITEMS: readonly {
  readonly id: WriteFormat;
  readonly label: string;
}[] = Object.freeze([
  { id: "vcf", label: "VCF compressed with bgzip (.vcf.gz)" },
  { id: "nei", label: "popnei's .nei file" },
]);

/** The button of the text after the download, with the look of a
    link. */
export const SAVE_AGAIN_LABEL = "Save it again";

/** The button of the text of a file written and not handed to the
    browser. */
export const SAVE_IT_LABEL = "Save it";

/** The line of the write: "Writing low_qual.filtered.vcf.gz · 35% ·
    0:12", the name of the file, the share of popnei's pass and the time
    since Download; with no share before popnei's first report. */
export function writingLine(
  name: string,
  share: number | null,
  seconds: number,
): string {
  const parts = [
    `Writing ${escaped(name)}`,
    ...(share === null ? [] : [`${String(share)}%`]),
    clockText(seconds),
  ];
  return parts.join(" · ");
}

/** The name of the bar of the write: "Writing low_qual.filtered.vcf.gz". */
export function writingBarLabel(name: string): string {
  return `Writing ${escaped(name)}`;
}

/** What the status region says after Stop: "The writing of
    low_qual.filtered.vcf.gz was stopped. Nothing was downloaded." */
export function stoppedText(name: string): string {
  return `The writing of ${escaped(name)} was stopped. Nothing was downloaded.`;
}

/**
 * The words of a write that failed, shown in the dialog with Close: the
 * store's `error` of the write of the file named `name` from the project
 * `p`. A failure of the statistics the write waited for, `ofStatistics`,
 * and a failure in the files wasm, which the calculation worker does not
 * hold, are defects, thrown: the button is enabled only once the one pass
 * is finished, so the write never waits for it.
 */
export function writeFailedText(
  error: AnalysisError,
  ofStatistics: boolean,
  p: Project,
  name: string,
): string {
  if (ofStatistics) {
    throw new Error(
      "popnei_web defect: a write of popgen2.html failed in the statistics it waited for, which it never waits for.",
    );
  }
  const file = escaped(name);
  if (error.kind === "refused") {
    return `${file} could not be written: popnei stopped with "${withoutStop(error.message)}". If the message speaks of memory, the file may be too large for this tab: leave out more variants or individuals with the filters, or write the file with popnei in Python, which writes files of any size. If it names a line of the VCF, correct the file, or fetch it again, and open it again.`;
  }
  const failure = error.error;
  switch (failure.kind) {
    case "workerFailed":
      return `${file} could not be written: the writing stopped unexpectedly, perhaps because the file did not fit in the memory of this tab. Leave out more variants or individuals with the filters and download again, or write the file with popnei in Python, which writes files of any size.`;
    case "defect": {
      const message = withoutStop(failure.message);
      return `The page met an error of its own while writing ${file}${message === "" ? "" : `: ${message}`}. Download again.`;
    }
    case "reopenFailed":
    case "couldNotStart":
    case "protocolMismatch":
      return failedText(error, p);
    case "files":
      throw new Error(
        `popnei_web defect: the write failed in the files wasm, which the calculation worker does not hold: ${failure.message}`,
      );
  }
}

/** What the text after the download says of the file, "downloaded" once
    it was handed to the browser, "written" while it was not. */
export type FileHanded = "downloaded" | "written";

/** What the text after the download is made of. */
export interface DownloadedFile {
  /** The name of the file, `writtenName` for its format. */
  readonly name: string;
  /** Its size in bytes. */
  readonly numBytes: number;
  /** The counts of the pass that wrote it. */
  readonly passStats: PassStats;
  /** The individuals kept and what each filter of the individuals
      removed, the store's `individualsKept`. */
  readonly kept: IndividualsKept;
  /** The number of individuals of the variants file. */
  readonly numIndividuals: number;
  /** Whether it was handed to the browser. */
  readonly handed: FileHanded;
}

/**
 * The text after the download, before its button: "low_qual.filtered.vcf.gz
 * downloaded, 42 KB: 772 variants of 111 individuals. Variants removed:
 * 300 by their FILTER, 58 by the missing rate, 70 by the MAF. Individuals
 * removed: 84 by the missing rate, 5 by the observed heterozygosity."
 * Each filter is counted over what the filters before it kept; one that
 * removed none is left out, and a line is left out when none of its kind
 * removed any.
 */
export function downloadedText(file: DownloadedFile): string {
  const individuals =
    file.kept.list.kind === "known" && file.kept.list.individuals !== null
      ? file.kept.list.individuals.length
      : file.numIndividuals;
  const sentences = [
    `${escaped(file.name)} ${file.handed}, ${sizeText(file.numBytes)}: ${counted(file.passStats.numVars, "variant")} of ${counted(individuals, "individual")}.`,
  ];
  const variants = VARIANT_FILTER_ORDER.flatMap((kind) => {
    const stats = file.passStats.filtering[kind];
    if (stats === undefined) return [];
    const removed = stats.varsProcessed - stats.varsKept;
    return removed > 0 ? [`${grouped(removed)} ${variantBy(kind)}`] : [];
  });
  if (variants.length > 0) {
    sentences.push(`Variants removed: ${variants.join(", ")}.`);
  }
  const removedIndividuals = file.kept.counts.flatMap((count) => {
    if (count.given === null || count.kept === null) {
      throw new Error(
        "popnei_web defect: the individuals kept of a file written are not known.",
      );
    }
    const removed = count.given - count.kept;
    return removed > 0
      ? [`${grouped(removed)} ${individualBy(count.kind)}`]
      : [];
  });
  if (removedIndividuals.length > 0) {
    sentences.push(`Individuals removed: ${removedIndividuals.join(", ")}.`);
  }
  return sentences.join(" ");
}

/** The words of a filter of the variants in the text after the
    download; the LD filter, which popgen2.html does not have, is a
    defect, thrown. */
function variantBy(kind: VariantFilterKind): string {
  switch (kind) {
    case "passed":
      return "by their FILTER";
    case "missing_data":
      return "by the missing rate";
    case "maf":
      return "by the MAF";
    case "obs_het":
      return "by the observed heterozygosity";
    case "ld":
      throw new Error(
        "popnei_web defect: the LD filter in a write of popgen2.html, which has none.",
      );
  }
}

/** The words of a threshold of the individuals in the text after the
    download; a list to keep or to remove, which popgen2.html does not
    have, is a defect, thrown. */
function individualBy(kind: IndividualFilterKind): string {
  switch (kind) {
    case "missing_data":
      return "by the missing rate";
    case "obs_het":
      return "by the observed heterozygosity";
    case "keep":
    case "remove":
      throw new Error(
        `popnei_web defect: a list of individuals, ${kind}, on popgen2.html, which has none.`,
      );
  }
}

/** The sentence of no variant kept, before or after the write: "None of
    the 1,200 variants of low_qual.vcf.gz pass the filters, so there is
    nothing to download.", with the variants of the file, `numVars` of
    the one pass. */
export function noVariantText(variantsName: string, numVars: number): string {
  return `None of the ${grouped(numVars)} variants of ${escaped(variantsName)} pass the filters, so there is nothing to download.`;
}

/** A message without the spaces around it and the full stop it may end
    with, so that the sentence it is put in has one. */
function withoutStop(message: string): string {
  const trimmed = message.trim();
  return trimmed.endsWith(".") ? trimmed.slice(0, -1) : trimmed;
}
