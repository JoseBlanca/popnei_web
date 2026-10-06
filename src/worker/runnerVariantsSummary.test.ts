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
import { gzipSync } from "node:zlib";

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
