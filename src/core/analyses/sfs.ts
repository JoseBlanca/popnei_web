/**
 * The folded site frequency spectrum of each population, a statistic of
 * the diversity's call of popnei: its spectra as the block of the
 * diversity's panel draws them, their CSV, and the spectrum's warning
 * (docs/specs/analyses/sfs.md, "The module").
 *
 * The expected numbers of variants are popnei's, `foldedSfs` of
 * `calcPopDiversity`, carried by the diversity's result; this module only
 * divides bins 1 to n / 2 of each population by their sum, the shares the
 * histograms draw.
 */

import { grouped } from "../project.ts";
import type { Project } from "../project.ts";
import type { Warning } from "../store.ts";
import { csvField, defect } from "./words.ts";
import type { DiversityResult } from "../../worker/protocol.ts";

/** The spectrum of one population, as the block draws it. */
export interface SpectrumOfPop {
  /** The name of the population. */
  readonly population: string;
  /** False for a population not given to calcPopDiversity, under the
      minimum of individuals: then variantsInDraw is 0, expected is empty
      and shares null. */
  readonly calculated: boolean;
  /** The variants of the population in the draw, popnei's numVars.inDraw. */
  readonly variantsInDraw: number;
  /** popnei's values, bins 0 to floor(n / 2), expected numbers of
      variants. */
  readonly expected: Float64Array;
  /** Bins 1 to floor(n / 2) over their sum; null when that sum is 0. */
  readonly shares: Float64Array | null;
}

/** The spectra of a diversity result. */
export interface Spectra {
  /** The size of the draw, n, of the request. */
  readonly numCalledAlleles: number;
  /** One spectrum per population, in the order of the result. */
  readonly pops: readonly SpectrumOfPop[];
  /** The largest share of any population, the top of every vertical axis;
      0 when no population has shares. */
  readonly largestShare: number;
}

/** The spectra of each result, so that the block drawn again gets the
    same object. */
const SPECTRA = new WeakMap<DiversityResult, Spectra>();

/**
 * The spectra of a diversity result; the same object for the same result.
 * Throws a defect when `foldedSfs` has not one entry per population, or
 * an array of it that is not `null` has not `floor(numCalledAlleles / 2)
 * + 1` values, or `numVarsInDraw` has no value for a population: a defect
 * of the runner.
 */
export function spectraOf(r: DiversityResult): Spectra {
  const kept = SPECTRA.get(r);
  if (kept !== undefined) {
    return kept;
  }
  if (r.foldedSfs.length !== r.pops.length) {
    throw defect(
      `the result of the diversity has ${String(r.foldedSfs.length)} spectra for ${String(r.pops.length)} populations.`,
    );
  }
  const numBins = Math.floor(r.numCalledAlleles / 2) + 1;
  const pops = r.pops.map((population, i): SpectrumOfPop => {
    const expected = r.foldedSfs[i];
    if (expected === undefined || expected === null) {
      return Object.freeze({
        population,
        calculated: false,
        variantsInDraw: 0,
        expected: new Float64Array(0),
        shares: null,
      });
    }
    if (expected.length !== numBins) {
      throw defect(
        `the spectrum of ${population} has ${String(expected.length)} values, and a draw of ${String(r.numCalledAlleles)} gives ${String(numBins)}.`,
      );
    }
    const variantsInDraw = r.numVarsInDraw[i];
    if (variantsInDraw === undefined) {
      throw defect(
        `the result of the diversity has no numVarsInDraw at ${String(i)}.`,
      );
    }
    return Object.freeze({
      population,
      calculated: true,
      variantsInDraw,
      expected,
      shares: sharesOf(expected),
    });
  });
  let largestShare = 0;
  for (const pop of pops) {
    for (const share of pop.shares ?? []) {
      largestShare = Math.max(largestShare, share);
    }
  }
  const spectra = Object.freeze({
    numCalledAlleles: r.numCalledAlleles,
    pops: Object.freeze(pops),
    largestShare,
  });
  SPECTRA.set(r, spectra);
  return spectra;
}

/** Bins 1 to the last of a spectrum over their sum, the variants expected
    to show both alleles in the draw; null when that sum is 0. */
function sharesOf(expected: Float64Array): Float64Array | null {
  const bothAlleles = expected.subarray(1);
  let sum = 0;
  for (const value of bothAlleles) {
    sum += value;
  }
  return sum > 0 ? bothAlleles.map((value) => value / sum) : null;
}

/** The header of the CSV of the spectra. */
const CSV_HEADER = "population,rarer_allele,variants,share";

/**
 * The spectra as the text of a CSV file: a header row, then one row per
 * population and count of the rarer allele, 0 to floor(n / 2), in the
 * order of the result, the numbers as `String` writes them, an empty
 * share for bin 0 and for a population with no shares, a population not
 * calculated left out, the population's name quoted as RFC 4180 has it
 * when it holds a comma, a quote or a new line, and each line ended by a
 * new line.
 */
export function spectraCsv(r: DiversityResult): string {
  const lines = spectraOf(r).pops.flatMap((pop) =>
    [...pop.expected].map((variants, count) => {
      const share = count === 0 ? undefined : pop.shares?.[count - 1];
      return [
        csvField(pop.population),
        String(count),
        String(variants),
        share === undefined ? "" : String(share),
      ].join(",");
    }),
  );
  return [CSV_HEADER, ...lines].map((line) => `${line}\n`).join("");
}

/** The threshold of the MAF filter at which it removes only the variants
    with no called allele, which the warning does not count. */
const MAF_KEEPS_ALL = 1;

/**
 * The warnings of the spectrum, which the diversity's warnings append,
 * given the project `p` the request of `r` was made from: a MAF filter
 * with a threshold below 1 that removed at least one of the variants it
 * was given, as the counts of the pass of `r` have them.
 */
export function spectrumWarnings(r: DiversityResult, p: Project): Warning[] {
  const filter = p.filters.find((f) => f.kind === "maf");
  const counts = r.passStats.filtering.maf;
  if (
    filter?.kind !== "maf" ||
    filter.maxAllowedMaf >= MAF_KEEPS_ALL ||
    counts === undefined ||
    counts.varsKept >= counts.varsProcessed
  ) {
    return [];
  }
  const removed = counts.varsProcessed - counts.varsKept;
  return [
    {
      code: "mafFilterOnSpectrum",
      text: `The MAF filter of the Variants step removes the variants whose commonest allele is above ${String(filter.maxAllowedMaf)} in the individuals kept, taken together, and it removed ${grouped(removed)} of the ${grouped(counts.varsProcessed)} it was given. So the spectrum lacks many of the rare alleles, and its first bins are lower than those of the population. To see every variant in the spectrum, turn off the MAF filter in the Variants step.`,
    },
  ];
}
