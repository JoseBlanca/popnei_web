/**
 * The measurement of the size of a written file made in node
 * (docs/specs/analyses/writeVariants.md, "The size, before the write"):
 * the bytes of the `.nei` file popnei's `writeVars` writes of 50,000
 * variants, for 2, 10, 20, 200 and 1,000 individuals, from VCFs of three
 * kinds of variant columns, and the bytes per variant besides one byte
 * per genotype that the estimate of the step adds.
 *
 *   node e2e/measure/writeSize.ts
 *
 * The VCFs are made here, plain text in memory, with the genotypes of
 * e2e/bigVcf.ts: diploid, the frequency of the allele of each variant
 * between 0.1 and 0.9, 3 in 100 genotypes missing, from a generator of a
 * fixed seed. Their variant columns are of three kinds: `plain`, as
 * e2e/bigVcf.ts, one chromosome `chr1`, no id, no quality, A and T;
 * `caller`, twelve chromosomes of a real assembly's names, `SL4.0ch01` to
 * `SL4.0ch12`, a quality of two decimals and alleles drawn from the four
 * bases, as a variant caller writes them; and `caller with ids`, the same
 * with an id `rs` and a number of 9 digits for each variant. It prints a
 * table in Markdown.
 */
import { cpus, totalmem } from "node:os";

import { init, openVcf, version, writeVars } from "popnei";

/** The variants of each file. */
const NUM_VARS = 50_000;

/** The numbers of individuals measured. */
const NUMS_INDIVIDUALS = [2, 10, 20, 200, 1000] as const;

/** The kinds of the variant columns. */
const KINDS = ["plain", "caller", "caller with ids"] as const;
type Kind = (typeof KINDS)[number];

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

const BASES = ["A", "C", "G", "T"] as const;

/** The bytes of a VCF of `NUM_VARS` variants of `numIndividuals`
    individuals, with variant columns of the kind `kind`. */
function vcf(numIndividuals: number, kind: Kind): Uint8Array {
  const random = generator(42);
  const chroms =
    kind === "plain"
      ? ["chr1"]
      : Array.from(
          { length: 12 },
          (_, i) => `SL4.0ch${String(i + 1).padStart(2, "0")}`,
        );
  const samples = Array.from(
    { length: numIndividuals },
    (_, i) => `s${String(i).padStart(4, "0")}`,
  ).join("\t");
  const lines: string[] = [
    "##fileformat=VCFv4.2",
    ...chroms.map((c) => `##contig=<ID=${c}>`),
    '##FORMAT=<ID=GT,Number=1,Type=String,Description="Genotype">',
    `#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\t${samples}`,
  ];
  const perChrom = Math.ceil(NUM_VARS / chroms.length);
  const genotypes: string[] = new Array<string>(numIndividuals);
  for (let v = 0; v < NUM_VARS; v += 1) {
    const chrom = chroms[Math.floor(v / perChrom)] ?? "chr1";
    const pos = 1000 * ((v % perChrom) + 1) + Math.floor(random() * 900);
    const freq = 0.1 + 0.8 * random();
    for (let i = 0; i < numIndividuals; i += 1) {
      genotypes[i] =
        random() < 0.03
          ? "./."
          : `${random() < freq ? "1" : "0"}/${random() < freq ? "1" : "0"}`;
    }
    let ref = "A";
    let alt = "T";
    let qual = ".";
    let id = ".";
    if (kind !== "plain") {
      const r = Math.floor(random() * 4);
      ref = BASES[r] ?? "A";
      alt = BASES[(r + 1 + Math.floor(random() * 3)) % 4] ?? "T";
      qual = (random() * 1000).toFixed(2);
    }
    if (kind === "caller with ids") {
      id = `rs${String(100_000_000 + Math.floor(random() * 900_000_000))}`;
    }
    lines.push(
      `${chrom}\t${String(pos)}\t${id}\t${ref}\t${alt}\t${qual}\tPASS\t.\tGT\t${genotypes.join("\t")}`,
    );
  }
  return new TextEncoder().encode(`${lines.join("\n")}\n`);
}

await init();
const rows: string[] = [];
for (const kind of KINDS) {
  for (const numIndividuals of NUMS_INDIVIDUALS) {
    const variants = openVcf(vcf(numIndividuals, kind));
    const written = writeVars(variants);
    variants.free();
    const numBytes = written.bytes.length;
    const perGenotype = numBytes / (NUM_VARS * numIndividuals);
    const perVariantBesides = numBytes / NUM_VARS - numIndividuals;
    rows.push(
      `| ${kind} | ${String(numIndividuals)} | ${numBytes.toLocaleString("en-US")} | ${perGenotype.toFixed(2)} | ${perVariantBesides.toFixed(1)} |`,
    );
  }
}

const lines = [
  `popnei ${version()}, node ${process.version}, ${cpus()[0]?.model ?? "?"}, ${String(Math.round(totalmem() / 2 ** 30))} GiB, ${String(NUM_VARS)} variants`,
  "",
  "| variant columns | individuals | bytes of the file | bytes per genotype | bytes per variant besides one per genotype |",
  "|---|---|---|---|---|",
  ...rows,
];
process.stdout.write(`${lines.join("\n")}\n`);
