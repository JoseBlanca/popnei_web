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
 * VCF, the column POS: `x80` is not a position", after the name of the
 * file.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeAll, describe, expect, test } from "vitest";

import type {
  FilterCountsJob,
  JobResult,
  Progress,
  VariantsSummaryJob,
  VariantsSummaryResult,
} from "./protocol.ts";
import { createRunner, loadPopnei, transferablesOf } from "./runner.ts";
import type { Answer, LoadToOpen, Runner } from "./runner.ts";

const FIXTURES = join(import.meta.dirname, "..", "..", "e2e", "fixtures");
const FILE_ID = "load-1";
const NEI: LoadToOpen = { fileId: FILE_ID, format: "nei", readOptions: null };
const VCF: LoadToOpen = {
  fileId: FILE_ID,
  format: "vcf",
  readOptions: { ploidy: 2, onlyPassed: true },
};
const JOB: VariantsSummaryJob = {
  analysis: "variantsSummary",
  fileId: FILE_ID,
  filters: [],
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

/** The numbers of a summary as plain values, for `toEqual`. */
function numbersOf(result: VariantsSummaryResult): unknown {
  return {
    chroms: result.chroms,
    numVarsPerChrom: [...result.numVarsPerChrom],
    passStats: result.passStats,
  };
}

beforeAll(async () => {
  expect(await loadPopnei()).toEqual({ ok: true, value: "0.1.0" });
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
    expect(transferablesOf(result)).toEqual([result.numVarsPerChrom.buffer]);
  });
});
