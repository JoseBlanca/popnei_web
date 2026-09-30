/**
 * A VCF large enough that a pass over it lasts seconds, written by a flow
 * into its output folder when it runs and never committed, and the CSV of
 * its individuals (the plan of the walking skeleton, the owner's decision
 * 3). It is written in node, with no Python, so that it is written on
 * GitHub too.
 *
 * Its lines are those of popnei's crates/popnei/benches/make_big_vcf.py:
 * 1,000 diploid individuals by default, or as many as it is given, `A` and `T` as the alleles, `.` in QUAL,
 * FILTER and INFO, `./.` for a genotype missing, 3 in 100 of them, so that
 * each variant takes the same 4,000 bytes of genotypes. The genotypes are
 * drawn from a generator of a fixed seed, with the frequency of the
 * allele of each variant between 0.1 and 0.9; they are not that script's
 * genotypes, and no number of them is read: the file is for the time of
 * a pass, and for the memory and the time of the LD decay, which do not
 * depend on LD (docs/plans/population-analyses.md, "Where the specs are
 * thin").
 *
 * Its variants are on one chromosome, 1,000 bp apart from 1,000 by
 * default, or as many base pairs apart as it is given, or at positions
 * drawn at random over a length it is given, from a generator of another
 * seed, so that the pairs of the LD decay fall at most distances.
 */
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";

/** How many individuals the VCF holds when it is not told. */
export const NUM_INDIVIDUALS = 1000;

/** The three populations of its CSV, the individual `i` in the `i % 3`. */
const POPS = ["a", "b", "c"];

/** The name of the individual `i` of `numIndividuals`, its number with
    as many digits as the last one's, and at least three: s000 to s999
    for 1,000, s0000 to s9999 for 10,000. */
function individual(i: number, numIndividuals: number): string {
  const digits = Math.max(3, String(numIndividuals - 1).length);
  return `s${String(i).padStart(digits, "0")}`;
}

/** A generator of numbers in [0, 1), xorshift32, the same for a seed. */
function generator(seed: number): () => number {
  let state = seed === 0 ? 1 : seed >>> 0;
  return () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0x1_0000_0000;
  };
}

/** Where the variants of the VCF are: `every` base pairs apart from
    `every`, or at positions drawn at random from 1 to `randomOver`. */
export type VcfPositions =
  { readonly every: number } | { readonly randomOver: number };

/** The positions of `numVars` variants, increasing, each at least 1
    above the one before: `every` base pairs apart, or drawn at random over
    `randomOver` and sorted, a position drawn twice moved up by 1 bp. */
function positionsOf(numVars: number, where: VcfPositions): Float64Array {
  const positions = new Float64Array(numVars);
  if ("every" in where) {
    for (let v = 0; v < numVars; v += 1) positions[v] = where.every * (v + 1);
    return positions;
  }
  const random = generator(7);
  for (let v = 0; v < numVars; v += 1) {
    positions[v] = 1 + Math.floor(random() * where.randomOver);
  }
  positions.sort();
  for (let v = 1; v < numVars; v += 1) {
    const before = positions[v - 1] ?? 0;
    if ((positions[v] ?? 0) <= before) positions[v] = before + 1;
  }
  return positions;
}

/** The lines of a VCF of `numVars` variants of `numIndividuals`
    individuals at the positions `where`, 4 bytes a genotype and about 30
    more a variant, in pieces of 2,000 variants. */
function* vcfLines(
  numVars: number,
  numIndividuals: number,
  where: VcfPositions,
): Generator<Buffer> {
  const random = generator(42);
  const positions = positionsOf(numVars, where);
  const samples = Array.from({ length: numIndividuals }, (_, i) =>
    individual(i, numIndividuals),
  ).join("\t");
  yield Buffer.from(
    "##fileformat=VCFv4.2\n##contig=<ID=chr1>\n" +
      '##FORMAT=<ID=GT,Number=1,Type=String,Description="Genotype">\n' +
      `#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\t${samples}\n`,
  );
  const genotypes = Buffer.alloc(4 * numIndividuals);
  const batch: Buffer[] = [];
  for (let v = 0; v < numVars; v += 1) {
    const freq = 0.1 + 0.8 * random();
    for (let i = 0; i < numIndividuals; i += 1) {
      const at = 4 * i;
      if (random() < 0.03) {
        genotypes.write("./.", at, "latin1");
      } else {
        genotypes[at] = random() < freq ? 0x31 : 0x30;
        genotypes[at + 1] = 0x2f;
        genotypes[at + 2] = random() < freq ? 0x31 : 0x30;
      }
      genotypes[at + 3] = i === numIndividuals - 1 ? 0x0a : 0x09;
    }
    batch.push(
      Buffer.from(
        `chr1\t${String(positions[v] ?? 0)}\tvar${String(v)}\tA\tT\t.\t.\t.\tGT\t`,
      ),
      Buffer.from(genotypes),
    );
    if (batch.length >= 4000) {
      yield Buffer.concat(batch);
      batch.length = 0;
    }
  }
  yield Buffer.concat(batch);
}

/** Writes at `path` a VCF of `numVars` variants of `numIndividuals`
    individuals, 1,000 when it is not given, at the positions `where`,
    1,000 bp apart when it is not given, compressed with gzip when `path`
    ends in `.gz`. */
export async function writeBigVcf(
  path: string,
  numVars: number,
  numIndividuals = NUM_INDIVIDUALS,
  where: VcfPositions = { every: 1000 },
): Promise<void> {
  const lines = Readable.from(vcfLines(numVars, numIndividuals, where));
  await (path.endsWith(".gz")
    ? pipeline(lines, createGzip({ level: 1 }), createWriteStream(path))
    : pipeline(lines, createWriteStream(path)));
}

/** The CSV of the `numIndividuals` individuals of the VCF, 1,000 when it
    is not given, `IID,pop`, in three populations. */
export function bigVcfPopsCsv(numIndividuals = NUM_INDIVIDUALS): string {
  const rows = Array.from(
    { length: numIndividuals },
    (_, i) =>
      `${individual(i, numIndividuals)},${POPS[i % POPS.length] ?? ""}\n`,
  );
  return `IID,pop\n${rows.join("")}`;
}

/** How many variants the VCF of the Stop in the middle holds. */
export const STOP_VCF_VARIANTS = 200_000;
