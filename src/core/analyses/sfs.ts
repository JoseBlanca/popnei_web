/**
 * The folded site frequency spectrum of each population, a statistic of
 * the diversity's call of popnei: its spectra as the block of the
 * diversity's panel draws them, and their CSV (docs/specs/analyses/sfs.md,
 * "The module").
 *
 * The expected numbers of variants are popnei's, `foldedSfs` of
 * `calcPopDiversity`, carried by the diversity's result; this module only
 * divides bins 1 to n / 2 of each population by their sum, the shares the
 * histograms draw. Its warning is in sfsWarnings.ts.
 */

import { csvField, defect } from "./words.ts";
import type { DiversityResult } from "../../worker/protocol.ts";

/** The spectrum of one population, as the block draws it. */
export interface SpectrumOfPop {
  /** The name of the population. */
  readonly population: string;
  /** The individuals of the population the calculation took, which the
      line of a population left out of the call names. */
  readonly numIndividuals: number;
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
 * `numIndividuals` no value for one, or
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
    const numIndividuals = r.numIndividuals[i];
    if (numIndividuals === undefined) {
      throw defect(
        `the result of the diversity has no numIndividuals at ${String(i)}.`,
      );
    }
    const expected = r.foldedSfs[i];
    if (expected === undefined || expected === null) {
      return Object.freeze({
        population,
        numIndividuals,
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
      numIndividuals,
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
export function allSpectraCsv(r: DiversityResult): string {
  return csvOf(spectraOf(r).pops.flatMap(spectrumLines));
}

/** The lines of the CSV of one population's spectrum, with no header. */
function spectrumLines(pop: SpectrumOfPop): readonly string[] {
  return [...pop.expected].map((variants, count) => {
    const share = count === 0 ? undefined : pop.shares?.[count - 1];
    return [
      csvField(pop.population),
      String(count),
      String(variants),
      share === undefined ? "" : String(share),
    ].join(",");
  });
}

/** The CSV of the spectra of `lines`, after its header, each line ended
    by a new line. */
function csvOf(lines: readonly string[]): string {
  return [CSV_HEADER, ...lines].map((line) => `${line}\n`).join("");
}

/** The line of one population in the plot of the spectrum of
    popgen2.html (sfs.md, "On popgen2.html"). */
export interface SpectrumLine {
  /** The name of the population. */
  readonly population: string;
  /** Its place in the order of the result, which gives its colour and
      its shape. */
  readonly index: number;
  /** The frequency of the commonest allele at each point, (n − j) / n,
      for j copies of the rarer allele from 1 to floor(n / 2). */
  readonly frequency: Float64Array;
  /** Bin j over the sum of every bin of the population, bin 0 among
      them, at each point. */
  readonly proportion: Float64Array;
  /** popnei's expected number of variants at each point, bin j. */
  readonly variants: Float64Array;
}

/** The lines of the spectrum of a diversity result. */
export interface SpectrumLines {
  /** The size of the draw, n, of the request. */
  readonly numCalledAlleles: number;
  /** The populations with a line, in the order of the result. */
  readonly lines: readonly SpectrumLine[];
  /** The largest proportion of any line; 0 when there is none. */
  readonly largestProportion: number;
}

/** The lines of each result. */
const LINES = new WeakMap<DiversityResult, SpectrumLines>();

/**
 * The lines of the spectrum of `r`, of the plot of popgen2.html: one per
 * population calculated with some variant that shows both alleles in the
 * draw, those `spectraOf` gives shares, in the order of the result; the
 * points from one copy of the rarer allele to floor(n / 2), each bin over
 * the sum of every bin of the population. The same object for the same
 * result. Throws the defects of `spectraOf`.
 */
export function spectrumLinesOf(r: DiversityResult): SpectrumLines {
  const kept = LINES.get(r);
  if (kept !== undefined) {
    return kept;
  }
  const n = r.numCalledAlleles;
  const lines: SpectrumLine[] = [];
  let largestProportion = 0;
  for (const [index, pop] of spectraOf(r).pops.entries()) {
    if (!pop.calculated || pop.shares === null) continue;
    let sum = 0;
    for (const value of pop.expected) {
      sum += value;
    }
    const variants = pop.expected.slice(1);
    const proportion = variants.map((value) => value / sum);
    for (const value of proportion) {
      largestProportion = Math.max(largestProportion, value);
    }
    lines.push(
      Object.freeze({
        population: pop.population,
        index,
        frequency: Float64Array.from(
          { length: variants.length },
          (_, i) => (n - (i + 1)) / n,
        ),
        proportion,
        variants,
      }),
    );
  }
  const answer = Object.freeze({
    numCalledAlleles: n,
    lines: Object.freeze(lines),
    largestProportion,
  });
  LINES.set(r, answer);
  return answer;
}

/** The header of the CSV of the lines. */
const LINES_CSV_HEADER =
  "population,rarer_allele,commonest_allele_frequency,variants,proportion";

/**
 * The data of the plot of the spectrum as the text of a CSV file: a
 * header row, then one row per point of each line, in the order of
 * `spectrumLinesOf`: the population, the count j of the rarer allele, the
 * frequency of the commonest allele, popnei's expected number of
 * variants and the proportion, the numbers as `String` writes them, the
 * name quoted as `allSpectraCsv` quotes it, each line ended by a new line.
 */
export function spectrumLinesCsv(r: DiversityResult): string {
  const rows = spectrumLinesOf(r).lines.flatMap((line) =>
    [...line.frequency].map((frequency, i) =>
      [
        csvField(line.population),
        String(i + 1),
        String(frequency),
        String(line.variants[i]),
        String(line.proportion[i]),
      ].join(","),
    ),
  );
  return [LINES_CSV_HEADER, ...rows].map((line) => `${line}\n`).join("");
}
