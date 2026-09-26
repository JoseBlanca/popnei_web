/**
 * The size expected of the file of the filtered variants before it is
 * written, whether it is large enough to warn of or too large to write,
 * and a size of a file in words (docs/specs/analyses/writeVariants.md,
 * "The size, before the write" and "The functions of core"). At the peak
 * of a write of F bytes the tab holds up to 3F, so the Variants step
 * says the size it expects before the user writes.
 */

import type { IndividualsKept } from "./individualsKept.ts";
import { grouped } from "./project.ts";
import type { Project } from "./project.ts";

/** The bytes of the file per genotype of a variant kept and an individual
    kept. Meanwhile 1: popnei's `writeVars` wrote 20,000 variants of 1,000
    individuals in 19,161,178 bytes, 0.96 per genotype, and the 1,152
    variants of the 200 individuals of panel.nei in 250,994, 1.09; set by
    the measurement of writeVariants.md. */
export const BYTES_PER_GENOTYPE = 1;

/** The estimate from which the step warns of the memory of the write.
    Meanwhile 500 MB, whose peak is up to 1.5 GB; set by the measurement of
    writeVariants.md. */
export const WRITE_WARN_BYTES = 500_000_000;

/** The estimate, from the counts themselves, from which the write is
    refused. Meanwhile 4 GB, under the 4 GiB, 4,294,967,296 bytes, that
    wasm addresses, which hold the variants read too; set by the
    measurement of writeVariants.md, to the largest file the three engines
    write. */
export const WRITE_MAX_BYTES = 4_000_000_000;

/** The size expected of the file of the filtered variants. */
export interface WriteEstimate {
  /** The variants the file would hold, or their bound. */
  readonly numVars: number;
  /** The individuals the file would hold, or their bound. */
  readonly numIndividuals: number;
  /** `numVars * numIndividuals * BYTES_PER_GENOTYPE`. */
  readonly numBytes: number;
  /** Whether either count is a bound, which the step says as "at most
      about", and otherwise "about". */
  readonly bound: boolean;
  /** Whether `numBytes` is `WRITE_WARN_BYTES` or more. */
  readonly warn: boolean;
  /** Whether `numBytes` is `WRITE_MAX_BYTES` or more from exact counts,
      and not from a bound. */
  readonly tooLarge: boolean;
}

/**
 * The size expected of the file of the filtered variants of `p`. The
 * variants are `variantsKept`, the number the counts of `filterCounts`
 * give for the current filters, exact; when it is `null`, the variants of
 * the file, `numVars` of its read, exact with no filter of the variants
 * and a bound with one. The individuals are those of `kept.list`: every
 * individual of the file when the list is known and `null`, the length of
 * the list when it is known, both exact; and `kept.byLists`, a bound,
 * while a threshold waits for the statistics of each individual. Gives
 * `null` when the variants are not known, no `variantsKept` and no
 * `numVars` of the file, when `kept` is `null`, and when the variants file
 * is not read, for which `individualsKept` gives `null` too.
 */
export function writeEstimate(
  p: Project,
  kept: IndividualsKept | null,
  variantsKept: number | null,
): WriteEstimate | null {
  const read = p.variants?.read;
  if (kept === null || read?.kind !== "read") {
    return null;
  }
  let numVars: number;
  let varsBound: boolean;
  if (variantsKept !== null) {
    numVars = variantsKept;
    varsBound = false;
  } else if (read.numVars !== null) {
    numVars = read.numVars;
    varsBound = p.filters.length > 0;
  } else {
    return null;
  }
  let numIndividuals: number;
  let individualsBound: boolean;
  switch (kept.list.kind) {
    case "known":
      numIndividuals = (kept.list.individuals ?? read.individuals).length;
      individualsBound = false;
      break;
    case "needsStatistics":
      numIndividuals = kept.byLists.length;
      individualsBound = true;
      break;
  }
  const numBytes = numVars * numIndividuals * BYTES_PER_GENOTYPE;
  const bound = varsBound || individualsBound;
  return {
    numVars,
    numIndividuals,
    numBytes,
    bound,
    warn: numBytes >= WRITE_WARN_BYTES,
    tooLarge: numBytes >= WRITE_MAX_BYTES && !bound,
  };
}

/** The units of `sizeText` above bytes, each 1,000 times the one before,
    with the decimals it is written with. */
const UNITS = [
  { name: "KB", bytes: 1e3, decimals: 0 },
  { name: "MB", bytes: 1e6, decimals: 1 },
  { name: "GB", bytes: 1e9, decimals: 1 },
] as const;

/**
 * A size of a file in decimal units, rounded to the nearest, with a comma
 * between groups of three digits of the whole part: under 1,000 bytes in
 * bytes, "1 byte" and "812 bytes"; under 1,000,000 in whole KB, "251 KB"; under
 * 1,000,000,000 in MB with one decimal, "19.2 MB"; and above in GB with
 * one decimal, "4.3 GB". A size that rounds to 1,000 of its unit is
 * written in the next: 999,600 bytes is "1.0 MB".
 */
export function sizeText(numBytes: number): string {
  if (numBytes === 1) {
    return "1 byte";
  }
  if (numBytes < 1000) {
    return `${String(numBytes)} bytes`;
  }
  for (const [index, unit] of UNITS.entries()) {
    const scale = 10 ** unit.decimals;
    // The size in units of its last decimal, rounded once, divided by a
    // whole number of bytes so that a half is rounded as it is written.
    const scaled = Math.round(numBytes / (unit.bytes / scale));
    const whole = Math.floor(scaled / scale);
    const isLast = index === UNITS.length - 1;
    if (whole < 1000 || isLast) {
      const fraction =
        unit.decimals === 0
          ? ""
          : `.${String(scaled % scale).padStart(unit.decimals, "0")}`;
      return `${grouped(whole)}${fraction} ${unit.name}`;
    }
  }
  throw new Error("popnei_web defect: sizeText went past its last unit.");
}
