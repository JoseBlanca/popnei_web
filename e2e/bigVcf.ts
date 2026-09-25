/**
 * A VCF large enough that a pass over it lasts seconds, written by a flow
 * into its output folder when it runs and never committed, and the CSV of
 * its individuals (the plan of the walking skeleton, the owner's decision
 * 3). It is written in node, with no Python, so that it is written on
 * GitHub too.
 *
 * Its lines are those of popnei's crates/popnei/benches/make_big_vcf.py:
 * 1,000 diploid individuals, `A` and `T` as the alleles, `.` in QUAL,
 * FILTER and INFO, `./.` for a genotype missing, 3 in 100 of them, so that
 * each variant takes the same 4,000 bytes of genotypes. The genotypes are
 * drawn from a generator of a fixed seed, with the frequency of the
 * allele of each variant between 0.1 and 0.9; they are not that script's
 * genotypes, and no number of them is read: the file is for the time of
 * a pass.
 */
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";

/** How many individuals the VCF holds. */
export const NUM_INDIVIDUALS = 1000;

/** The three populations of its CSV, the individual `i` in the `i % 3`. */
const POPS = ["a", "b", "c"];

/** The name of the individual `i`. */
function individual(i: number): string {
  return `s${String(i).padStart(3, "0")}`;
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

/** The lines of a VCF of `numVars` variants of the 1,000 individuals,
    about 4,030 bytes a variant, in pieces of 2,000 variants. */
function* vcfLines(numVars: number): Generator<Buffer> {
  const random = generator(42);
  const samples = Array.from({ length: NUM_INDIVIDUALS }, (_, i) =>
    individual(i),
  ).join("\t");
  yield Buffer.from(
    "##fileformat=VCFv4.2\n##contig=<ID=chr1>\n" +
      '##FORMAT=<ID=GT,Number=1,Type=String,Description="Genotype">\n' +
      `#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\t${samples}\n`,
  );
  const genotypes = Buffer.alloc(4 * NUM_INDIVIDUALS);
  const batch: Buffer[] = [];
  for (let v = 0; v < numVars; v += 1) {
    const freq = 0.1 + 0.8 * random();
    for (let i = 0; i < NUM_INDIVIDUALS; i += 1) {
      const at = 4 * i;
      if (random() < 0.03) {
        genotypes.write("./.", at, "latin1");
      } else {
        genotypes[at] = random() < freq ? 0x31 : 0x30;
        genotypes[at + 1] = 0x2f;
        genotypes[at + 2] = random() < freq ? 0x31 : 0x30;
      }
      genotypes[at + 3] = i === NUM_INDIVIDUALS - 1 ? 0x0a : 0x09;
    }
    batch.push(
      Buffer.from(
        `chr1\t${String(1000 * (v + 1))}\tvar${String(v)}\tA\tT\t.\t.\t.\tGT\t`,
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

/** Writes at `path` a VCF of `numVars` variants of the 1,000
    individuals, compressed with gzip when `path` ends in `.gz`. */
export async function writeBigVcf(
  path: string,
  numVars: number,
): Promise<void> {
  const lines = Readable.from(vcfLines(numVars));
  await (path.endsWith(".gz")
    ? pipeline(lines, createGzip({ level: 1 }), createWriteStream(path))
    : pipeline(lines, createWriteStream(path)));
}

/** The CSV of the individuals of the VCF, `IID,pop`, in three
    populations. */
export function bigVcfPopsCsv(): string {
  const rows = Array.from(
    { length: NUM_INDIVIDUALS },
    (_, i) => `${individual(i)},${POPS[i % POPS.length] ?? ""}\n`,
  );
  return `IID,pop\n${rows.join("")}`;
}

/** How many variants the VCF of the Stop in the middle holds. */
export const STOP_VCF_VARIANTS = 200_000;
