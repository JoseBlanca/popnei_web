/**
 * The runner's summary of the variants file in node, over the fixtures of
 * e2e/fixtures/ given as bytes (docs/plans/open-variants.md, "The
 * phases", 1). The numbers are popnei's, compared exactly: the runner
 * passes them on with no arithmetic. The same counts were given by
 * popnei's Python, `calc_var_density(variants, 2**53 - 1,
 * chrom_lengths={})` of the checkout at /Users/jose/devel/popnei, on the
 * same files on 5 October 2026: 1,200 variants on the chromosome 1 for
 * panel.nei and panel.vcf.gz, 250 on chr1 and 250 on chr2 for ld.vcf.gz
 * and ld.nei; and for bad_position.vcf.gz the refusal "line 84 of the
 * VCF, the column POS: `x80` is not a position", which Python gives after
 * the path of the file and the runner gives alone. For the VCF with
 * `##contig` lines built here, Python gave 3 variants on 2 and 1 on 1
 * with only the passed variants, and 3 and 2 with every variant.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";

import { beforeAll, describe, expect, test } from "vitest";

import type {
  FilterCountsJob,
  IndividualChecksJob,
  JobResult,
  Progress,
  VariantChecksJob,
  VariantsSummaryJob,
  VariantsSummaryResult,
} from "./protocol.ts";
import {
  chromsOf,
  copiedSummary,
  createRunner,
  loadPopnei,
  transferablesOf,
} from "./runner.ts";
import type { Answer, LoadToOpen, Runner } from "./runner.ts";
import { INSTALLED_POPNEI_VERSION } from "./testSupport.ts";

const FIXTURES = join(import.meta.dirname, "..", "..", "e2e", "fixtures");
const FILE_ID = "load-1";
const NEI: LoadToOpen = { fileId: FILE_ID, format: "nei", readOptions: null };
const VCF: LoadToOpen = {
  fileId: FILE_ID,
  format: "vcf",
  readOptions: { ploidy: 2, onlyPassed: true },
};
/** The bins of the histograms of the variants that popgen2.html asks
    for, those of variantChecks.ts. */
const BINS = { minNumIndividuals: 0, numBins: 1280, range: [0, 1] } as const;
const JOB: VariantsSummaryJob = {
  analysis: "variantsSummary",
  fileId: FILE_ID,
  filters: [],
  ...BINS,
};

/** The bytes of a fixture, a copy: node keeps a small file it reads inside
    a larger buffer it shares, which popnei would be given whole. */
function bytesOf(name: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(readFileSync(join(FIXTURES, name)));
}

/** A runner with the fixture `name` opened, as a `.nei` file or as a VCF
    of ploidy 2 with only the passed variants. */
function opened(name: string): Runner {
  const runner = createRunner();
  const load = name.endsWith(".nei") ? NEI : VCF;
  const answer = runner.open(load, { name, source: bytesOf(name) });
  expect(answer.kind).toBe("ok");
  return runner;
}

function ignore(): void {
  // The progress, which these tests do not look at.
}

/** The result of an answer that has to be a summary. */
function summaryOf(answer: Answer<JobResult>): VariantsSummaryResult {
  if (answer.kind !== "ok") {
    throw new Error(`the answer is ${answer.kind}: ${JSON.stringify(answer)}`);
  }
  if (answer.value.analysis !== "variantsSummary") {
    throw new Error(`the result is of ${answer.value.analysis}`);
  }
  return answer.value;
}

/** The chromosomes and the counts of a summary as plain values, for
    `toEqual`. */
function numbersOf(result: VariantsSummaryResult): unknown {
  return {
    chroms: result.chroms,
    numVarsPerChrom: [...result.numVarsPerChrom],
    passStats: result.passStats,
  };
}

/** The chromosomes and the counts that `chromsOf` gives, as plain values,
    for `toEqual`. */
function chromNumbersOf(given: ReturnType<typeof chromsOf>): unknown {
  return {
    chroms: given.chroms,
    numVarsPerChrom: [...given.numVarsPerChrom],
  };
}

beforeAll(async () => {
  expect(await loadPopnei()).toEqual({
    ok: true,
    value: INSTALLED_POPNEI_VERSION,
  });
});

describe("open-variants 1 the runner's summary of the variants file", () => {
  test.each(["panel.nei", "panel.vcf.gz"])(
    "%s gives its 1,200 variants, all on the chromosome 1",
    (name) => {
      const result = summaryOf(opened(name).run(JOB, ignore));
      expect(numbersOf(result)).toEqual({
        chroms: ["1"],
        numVarsPerChrom: [1200],
        passStats: { numVars: 1200, filtering: {} },
      });
    },
  );

  test.each(["ld.vcf.gz", "ld.nei"])(
    "%s gives its two chromosomes in the order of the file, 250 variants on each",
    (name) => {
      const result = summaryOf(opened(name).run(JOB, ignore));
      expect(numbersOf(result)).toEqual({
        chroms: ["chr1", "chr2"],
        numVarsPerChrom: [250, 250],
        passStats: { numVars: 500, filtering: {} },
      });
    },
  );

  test("bad_position.vcf.gz opens, and its pass is refused with popnei's words for the line of the position that is not a number", () => {
    const runner = createRunner();
    const open = runner.open(VCF, {
      name: "bad_position.vcf.gz",
      source: bytesOf("bad_position.vcf.gz"),
    });
    expect(open.kind === "ok" ? open.value.individuals.length : open).toBe(200);
    expect(runner.run(JOB, ignore)).toEqual({
      kind: "refused",
      message: "line 84 of the VCF, the column POS: `x80` is not a position",
    });
  });

  test("a genotype of ploidy 1 in panel.vcf, read with the ploidy of the file, refuses the one pass with popnei's words, so the variants are not counted either", () => {
    const lines = gunzipSync(bytesOf("panel.vcf.gz")).toString().split("\n");
    // Line 9 of the file, its first variant: the genotype of s000.
    const fields = (lines[8] ?? "").split("\t");
    expect(fields[9]).toBe("0/1");
    fields[9] = "1";
    lines[8] = fields.join("\t");
    const runner = createRunner();
    const open = runner.open(PAGE_VCF, {
      name: "haploid.vcf.gz",
      source: new Uint8Array(gzipSync(lines.join("\n"))),
    });
    expect(open.kind).toBe("ok");
    expect(runner.run(JOB, ignore)).toEqual({
      kind: "refused",
      message:
        "line 9 of the VCF, the column of s000: its genotype is of the ploidy 1 and the variants are read with the ploidy 2; popnei does not read a VCF whose genotypes are of different ploidies",
    });
  });

  test("panel.nei with 400 bytes of its middle changed opens, and its pass is refused as a damaged file", () => {
    const bytes = bytesOf("panel.nei");
    const middle = Math.floor(bytes.length / 2);
    for (let at = middle; at < middle + 400; at += 1) {
      bytes[at] = (bytes[at] ?? 0) ^ 0xff;
    }
    const runner = createRunner();
    expect(runner.open(NEI, { name: "panel.nei", source: bytes }).kind).toBe(
      "ok",
    );
    const answer = runner.run(JOB, ignore);
    expect(answer.kind === "refused" ? answer.message : answer).toMatch(
      /^the batch \d+ of the vars file could not be read, so the file is damaged and has to be fetched or copied again: /u,
    );
  });

  test("after a count with the missing data filter, the summary is of every variant of the file", () => {
    const runner = opened("panel.nei");
    const counts: FilterCountsJob = {
      analysis: "filterCounts",
      fileId: FILE_ID,
      filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.05 }],
      individuals: null,
    };
    const counted = runner.run(counts, ignore);
    expect(counted.kind === "ok" ? counted.value.passStats.numVars : null).toBe(
      1152,
    );
    const result = summaryOf(runner.run(JOB, ignore));
    expect(numbersOf(result)).toEqual({
      chroms: ["1"],
      numVarsPerChrom: [1200],
      passStats: { numVars: 1200, filtering: {} },
    });
  });

  test("the pass is told as pass 1 of 1, and the counts are transferred, the array owning its buffer", () => {
    const told: Progress[] = [];
    const result = summaryOf(
      opened("panel.vcf.gz").run(JOB, (progress) => {
        told.push(progress);
      }),
    );
    expect(told.length).toBeGreaterThan(0);
    expect(
      told.every((progress) => progress.pass === 1 && progress.numPasses === 1),
    ).toBe(true);
    const { perVar, perIndividual } = result;
    expect(transferablesOf(result)).toEqual([
      result.numVarsPerChrom.buffer,
      perVar.binEdges.buffer,
      perVar.missingRate.counts.buffer,
      perVar.maf.counts.buffer,
      perVar.obsHet.counts.buffer,
      perVar.unbiasedExpHet.counts.buffer,
      perIndividual.missingGtRate.buffer,
      perIndividual.obsHetRate.buffer,
    ]);
  });
});

/** The VCF read as popgen2.html reads it: the ploidy read from the file,
    every variant whatever its FILTER. */
const PAGE_VCF: LoadToOpen = {
  fileId: FILE_ID,
  format: "vcf",
  readOptions: { ploidy: null, onlyPassed: false },
};

describe("live-stats 1 the one pass of the summary gives the statistics of their own requests", () => {
  test.each([
    ["panel.vcf.gz", 1200, 200],
    ["panel.nei", 1200, 200],
    ["tetraploid.vcf.gz", 200, 12],
  ])(
    "%s: the histograms of the variants and the statistics of each individual are those of variantChecks and individualChecks, to the bit, over its %i variants and %i individuals",
    (name, numVars, numIndividuals) => {
      const runner = createRunner();
      const load = name.endsWith(".nei") ? NEI : PAGE_VCF;
      expect(runner.open(load, { name, source: bytesOf(name) }).kind).toBe(
        "ok",
      );
      const summary = summaryOf(runner.run(JOB, ignore));
      const variantsJob: VariantChecksJob = {
        analysis: "variantChecks",
        fileId: FILE_ID,
        filters: [],
        individuals: null,
        ...BINS,
      };
      const individualsJob: IndividualChecksJob = {
        analysis: "individualChecks",
        fileId: FILE_ID,
        filters: [],
      };
      const variants = runner.run(variantsJob, ignore);
      const individuals = runner.run(individualsJob, ignore);
      if (variants.kind !== "ok" || individuals.kind !== "ok") {
        throw new Error("the statistics of their own requests failed");
      }
      expect({ analysis: "variantChecks", ...summary.perVar }).toStrictEqual(
        variants.value,
      );
      expect({
        analysis: "individualChecks",
        ...summary.perIndividual,
      }).toStrictEqual(individuals.value);
      expect(summary.passStats).toEqual({ numVars, filtering: {} });
      expect(summary.perIndividual.individuals).toHaveLength(numIndividuals);
    },
  );
});

/** A VCF of two individuals whose header names three chromosomes with
    lengths, 2 of 50 base pairs, 1 and scaf9 of 1,000, and whose variants
    are on 2, then 1, then 2 again: one on 1 has the FILTER LowQ, and the
    last one on 2 is at the position 60, past the length of 2. Gzipped,
    as the runner is given a file. */
const CONTIGS_VCF = new Uint8Array(
  gzipSync(
    [
      "##fileformat=VCFv4.2",
      "##contig=<ID=2,length=50>",
      "##contig=<ID=1,length=1000>",
      "##contig=<ID=scaf9,length=1000>",
      '##FORMAT=<ID=GT,Number=1,Type=String,Description="Genotype">',
      "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\ta\tb",
      "2\t10\t.\tA\tG\t.\tPASS\t.\tGT\t0/1\t0/0",
      "2\t20\t.\tA\tG\t.\tPASS\t.\tGT\t0/1\t1/1",
      "1\t5\t.\tC\tT\t.\tPASS\t.\tGT\t0/0\t0/1",
      "1\t100\t.\tC\tT\t.\tLowQ\t.\tGT\t0/1\t0/1",
      "2\t60\t.\tA\tG\t.\t.\t.\tGT\t1/1\t0/1",
      "",
    ].join("\n"),
  ),
);

/** The summary of CONTIGS_VCF read with `onlyPassed`. */
function contigsSummary(onlyPassed: boolean): VariantsSummaryResult {
  const runner = createRunner();
  const load: LoadToOpen = {
    fileId: FILE_ID,
    format: "vcf",
    readOptions: { ploidy: 2, onlyPassed },
  };
  expect(
    runner.open(load, { name: "contigs.vcf.gz", source: CONTIGS_VCF }).kind,
  ).toBe("ok");
  return summaryOf(runner.run(JOB, ignore));
}

describe("open-variants 1 the runner's summary of the variants file: the lengths of the header and onlyPassed", () => {
  test("only the chromosomes with variants, in the order of their first variant, and a variant past the length of its header refuses nothing", () => {
    expect(numbersOf(contigsSummary(true))).toEqual({
      chroms: ["2", "1"],
      numVarsPerChrom: [3, 1],
      passStats: { numVars: 4, filtering: {} },
    });
  });

  test("read with every variant, the LowQ variant is counted on 1", () => {
    expect(numbersOf(contigsSummary(false))).toEqual({
      chroms: ["2", "1"],
      numVarsPerChrom: [3, 2],
      passStats: { numVars: 5, filtering: {} },
    });
  });
});

/** An answer of calcVarDensity made by hand: the windows of `chroms`,
    from `start`, with `numVars`, and a pass of `numVarsOfPass`. */
function density(
  chroms: readonly string[],
  start: readonly number[],
  numVars: readonly number[],
  numVarsOfPass: number,
): Parameters<typeof chromsOf>[0] {
  return {
    chroms,
    start: Float64Array.from(start),
    end: Float64Array.from(start, () => Number.MAX_SAFE_INTEGER),
    numVars: Uint32Array.from(numVars),
    passStats: { numVars: numVarsOfPass, filtering: {}, stoppedEarly: false },
  };
}

describe("open-variants 1 chromsOf, popnei's density made the chromosomes of the result", () => {
  test("one window per chromosome from the position 1 gives the chromosomes and their counts", () => {
    expect(
      chromNumbersOf(chromsOf(density(["2", "1"], [1, 1], [3, 1], 4))),
    ).toEqual({
      chroms: ["2", "1"],
      numVarsPerChrom: [3, 1],
    });
  });

  test.each([
    ["a chromosome twice", density(["1", "1"], [1, 1], [3, 1], 4)],
    [
      "a window that does not start at 1",
      density(["1", "2"], [1, 2], [3, 1], 4),
    ],
    ["counts fewer than the chromosomes", density(["1", "2"], [1, 1], [4], 4)],
    ["starts fewer than the chromosomes", density(["1", "2"], [1], [3, 1], 4)],
    [
      "counts that do not add up to the pass",
      density(["1", "2"], [1, 1], [3, 1], 5),
    ],
  ])("%s is a defect", (_name, given) => {
    expect(() => chromsOf(given)).toThrow(/^popnei_web defect:/u);
  });
});

/** The genotypes of the two halves of `halvesVcf`, of its three
    individuals, one row per variant in turn: the second half has missing
    genotypes, which the first has none of, and more of the alternative
    allele, so that a statistic over the first half differs from the same
    statistic over the whole file. */
const FIRST_HALF_GTS = [
  ["0/1", "0/0", "0/0"],
  ["0/0", "0/1", "0/0"],
  ["1/1", "0/0", "0/1"],
] as const;
const SECOND_HALF_GTS = [
  ["./.", "1/1", "0/1"],
  ["1/1", "./.", "1/1"],
  ["0/1", "1/1", "./."],
  ["./.", "0/1", "1/1"],
] as const;

/** A VCF of `numFirst` variants of the first half and `numSecond` of the
    second on the chromosome 1, of three diploid individuals, gzipped;
    popnei reads it in blocks of 10,000 variants, so 10,000 and 10,000
    are two blocks, one per half. */
function halvesVcf(
  numFirst: number,
  numSecond: number,
): Uint8Array<ArrayBuffer> {
  const lines = [
    "##fileformat=VCFv4.2",
    "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\ts0\ts1\ts2",
  ];
  for (let v = 0; v < numFirst + numSecond; v += 1) {
    const rows = v < numFirst ? FIRST_HALF_GTS : SECOND_HALF_GTS;
    const gts = rows[v % rows.length] ?? [];
    lines.push(`1\t${String(v + 1)}\t.\tA\tT\t.\t.\t.\tGT\t${gts.join("\t")}`);
  }
  return new Uint8Array(gzipSync(`${lines.join("\n")}\n`));
}

/** The summary of `source` read whole by a runner of popnei's own
    `soFarEvery`, which gives no result so far for a file this small. */
function summaryOfWhole(
  source: Uint8Array<ArrayBuffer>,
): VariantsSummaryResult {
  const runner = createRunner();
  expect(runner.open(PAGE_VCF, { name: "half.vcf.gz", source }).kind).toBe(
    "ok",
  );
  return summaryOf(runner.run(JOB, ignore));
}

/** The buffers of `copy` and of `given` are disjoint, and `copy` has as
    many as `given`: each array `transferablesOf` lists, and with it each
    field a summary has, was copied. */
function expectCopied(
  copy: VariantsSummaryResult,
  given: VariantsSummaryResult,
): void {
  const ofGiven = transferablesOf(given);
  const ofCopy = transferablesOf(copy);
  expect(ofCopy).toHaveLength(ofGiven.length);
  for (const buffer of ofCopy) {
    expect(ofGiven.includes(buffer)).toBe(false);
  }
}

describe("live-stats 2 the results so far of the summary of the variants file", () => {
  // popnei's numbers under node, js-v0.2.1: the VCF of 20,000 variants
  // and three individuals is read in two blocks, and with soFarEvery 0
  // popnei gives a result so far after each, over 10,000 and then 20,000
  // variants. The first is popnei's summary of the first half read alone.
  test("a file of two blocks gives a result so far after each with soFarEvery 0, the first equal to the summary of its first block alone and the last the result, each a copy that can be transferred", () => {
    const runner = createRunner({ soFarEvery: 0 });
    const open = runner.open(PAGE_VCF, {
      name: "two_blocks.vcf.gz",
      source: halvesVcf(10_000, 10_000),
    });
    expect(open.kind).toBe("ok");
    const soFar: JobResult[] = [];
    const result = summaryOf(
      runner.run(JOB, ignore, (given) => {
        soFar.push(given);
      }),
    );
    const summaries = soFar.map((given) =>
      summaryOf({ kind: "ok", value: given }),
    );
    expect(summaries).toHaveLength(2);
    const [first, last] = summaries;
    const firstHalf = summaryOfWhole(halvesVcf(10_000, 0));
    expect(first).toEqual(firstHalf);
    expect(numbersOf(firstHalf)).toEqual({
      chroms: ["1"],
      numVarsPerChrom: [10_000],
      passStats: { numVars: 10_000, filtering: {} },
    });
    // The halves differ, so the first result so far cannot be the
    // result by chance.
    expect(first).not.toEqual(result);
    expect(first?.perIndividual.missingGtRate).not.toEqual(
      result.perIndividual.missingGtRate,
    );
    expect(first?.perVar.missingRate.mean).not.toBe(
      result.perVar.missingRate.mean,
    );
    expect(last).toEqual(result);
    expect(numbersOf(result)).toEqual({
      chroms: ["1"],
      numVarsPerChrom: [20_000],
      passStats: { numVars: 20_000, filtering: {} },
    });
    expect(result.perVar.binEdges).toHaveLength(1281);
    expect(result.perIndividual.individuals).toEqual(["s0", "s1", "s2"]);
    // No buffer of a result so far is that of the result or of another
    // result so far, and transferring them leaves the result whole.
    const seen = new Set<ArrayBuffer>(transferablesOf(result));
    const numSeen = seen.size;
    for (const given of summaries) {
      const buffers = transferablesOf(given);
      expect(buffers).toHaveLength(numSeen);
      for (const buffer of buffers) {
        expect(seen.has(buffer)).toBe(false);
        seen.add(buffer);
      }
      structuredClone(given, { transfer: buffers });
    }
    expect(result.perVar.binEdges).toHaveLength(1281);
  });

  test("copiedSummary copies every array transferablesOf lists into a buffer of its own", () => {
    const given = summaryOfWhole(halvesVcf(30, 30));
    const copy = copiedSummary(given);
    expect(copy).toEqual(given);
    expectCopied(copy, given);
  });

  test("copiedSummary of a summary whose arrays are views of one buffer: no buffer of the copy is that buffer, and a transfer of the copy leaves the summary whole", () => {
    const shared = new ArrayBuffer(8 * 16);
    let offset = 0;
    /** The next `length` floats of the shared buffer. */
    const floats = (length: number): Float64Array => {
      const array = new Float64Array(shared, offset, length);
      offset += 8 * length;
      return array.fill(0.25);
    };
    const counts = (): Uint32Array => {
      const array = new Uint32Array(shared, offset, 2);
      offset += 8;
      return array.fill(3);
    };
    const passStats = { numVars: 6, filtering: {} };
    const distrib = (): { mean: number; counts: Uint32Array } => ({
      mean: 0.25,
      counts: counts(),
    });
    const given: VariantsSummaryResult = {
      analysis: "variantsSummary",
      chroms: ["1"],
      numVarsPerChrom: counts(),
      perVar: {
        binEdges: floats(3),
        missingRate: distrib(),
        maf: distrib(),
        obsHet: distrib(),
        unbiasedExpHet: distrib(),
        passStats,
      },
      perIndividual: {
        individuals: ["s0", "s1"],
        missingGtRate: floats(2),
        obsHetRate: floats(2),
        passStats,
      },
      passStats,
    };
    const copy = copiedSummary(given);
    const buffers = transferablesOf(copy);
    expect(buffers).toHaveLength(8);
    expect(buffers.includes(shared)).toBe(false);
    structuredClone(copy, { transfer: buffers });
    expect(shared.byteLength).toBe(8 * 16);
    expect([...given.perIndividual.obsHetRate]).toEqual([0.25, 0.25]);
    expect([...given.perVar.maf.counts]).toEqual([3, 3]);
  });

  test("with popnei's 2 seconds, panel.vcf.gz, read in less, gives no result so far", () => {
    const soFar: JobResult[] = [];
    summaryOf(
      opened("panel.vcf.gz").run(JOB, ignore, (given) => {
        soFar.push(given);
      }),
    );
    expect(soFar).toEqual([]);
  });

  test("what the function of the results so far throws is thrown by the run, that very value, ours, and not answered as popnei's refusal", () => {
    const runner = createRunner({ soFarEvery: 0 });
    runner.open(PAGE_VCF, {
      name: "two_blocks.vcf.gz",
      source: halvesVcf(10_000, 10_000),
    });
    const thrown = new Error("the result so far could not be posted");
    expect(
      thrownBy(() =>
        runner.run(JOB, ignore, () => {
          throw thrown;
        }),
      ),
    ).toBe(thrown);
    // Thrown at the last block too, after which popnei's call returns.
    const atTheEnd = new Error("thrown at the last result so far");
    let calls = 0;
    expect(
      thrownBy(() =>
        runner.run(JOB, ignore, () => {
          calls += 1;
          if (calls === 2) throw atTheEnd;
        }),
      ),
    ).toBe(atTheEnd);
  });
});

/** What `call` threw, or null when it returned: compared with `toBe`, it
    is that very value, which `toThrow` would check only by its message. */
function thrownBy(call: () => unknown): unknown {
  try {
    call();
  } catch (error: unknown) {
    return error;
  }
  return null;
}
