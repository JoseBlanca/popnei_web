/**
 * The filter of the FILTER column in the runner, in node, over the
 * fixtures of e2e/fixtures/ given as bytes (docs/specs/worker/runner.md,
 * "How it is verified", bullets "The open" and "The filter of the FILTER
 * column"). The numbers are popnei's of the release js-v0.2.1, taken under
 * node on 7 October 2026, and those of `keepsPassed` and of low_qual.nei
 * of js-v0.2.2, taken under node on 8 October 2026, compared exactly:
 * low_qual.vcf.gz is the panel with LowQual in the FILTER column of every
 * fourth variant, 300 of its 1,200, and low_qual.nei that VCF read with
 * every variant and written by popnei 0.2.2, so that it records which
 * passed.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- the test spies on popnei's Variants to read the steps the runner put on it, which the runner never exposes
import { Variants } from "popnei";
import { beforeAll, describe, expect, test, vi } from "vitest";

import type {
  DiversityJob,
  DiversityResult,
  JobResult,
  Opened,
  Pops,
  VariantFilter,
} from "./protocol.ts";
import { createRunner, loadPopnei } from "./runner.ts";
import type { Answer, LoadFile, LoadToOpen, Runner } from "./runner.ts";
import { INSTALLED_POPNEI_VERSION } from "./testSupport.ts";

const FIXTURES = join(import.meta.dirname, "..", "..", "e2e", "fixtures");
const FILE_ID = "load-1";

/** A VCF opened as popgen2.html opens every VCF, with every variant. */
const VCF_EVERY_VARIANT: LoadToOpen = {
  fileId: FILE_ID,
  format: "vcf",
  readOptions: { ploidy: 2, onlyPassed: false },
};
const NEI: LoadToOpen = { fileId: FILE_ID, format: "nei", readOptions: null };
/** The read options of a VCF opened with only the variants that passed. */
const VCF_ONLY_PASSED = { ploidy: 2, onlyPassed: true } as const;

const PASSED: VariantFilter = { kind: "passed" };
const MISSING_DATA: VariantFilter = {
  kind: "missing_data",
  maxAllowedMissingRate: 0.05,
};
const MAF: VariantFilter = { kind: "maf", maxAllowedMaf: 0.95 };

/** The first 111 individuals of the panel, s000 to s110. */
const FIRST_111 = Array.from(
  { length: 111 },
  (_, i) => `s${String(i).padStart(3, "0")}`,
);

beforeAll(async () => {
  expect(await loadPopnei()).toEqual({
    ok: true,
    value: INSTALLED_POPNEI_VERSION,
  });
});

/** The bytes of a fixture, a copy: node keeps a small file it reads inside
    a larger buffer it shares, which popnei would be given whole. */
function bytesOf(name: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(readFileSync(join(FIXTURES, name)));
}

/** The panel's 200 individuals as one population. */
function onePop(): Pops {
  return [
    [
      "all",
      Array.from({ length: 200 }, (_, i) => `s${String(i).padStart(3, "0")}`),
    ],
  ];
}

/** A diversity job of the filters and the list, over one population. */
function diversityJob(
  filters: readonly VariantFilter[],
  individuals: readonly string[] | null = null,
): DiversityJob {
  return {
    analysis: "diversity",
    fileId: FILE_ID,
    filters,
    individuals,
    pops: individuals === null ? onePop() : [["all", individuals]],
    minNumIndividuals: 20,
    polyThreshold: 0.95,
    numCalledAlleles: 40,
    popDiversityPops: [],
  };
}

/** A fixture whose reads of the source are counted. */
function counted(name: string): {
  readonly file: LoadFile;
  reads: () => number;
} {
  const bytes = bytesOf(name);
  let numReads = 0;
  const file: LoadFile = {
    name,
    get source() {
      numReads += 1;
      return bytes;
    },
  };
  return { file, reads: () => numReads };
}

/** A runner with the fixture `name` opened as `load`. */
function opened(name: string, load: LoadToOpen): Runner {
  const runner = createRunner();
  expect(runner.open(load, { name, source: bytesOf(name) }).kind).toBe("ok");
  return runner;
}

function ignore(): void {
  // The progress, which these tests do not look at.
}

/** The diversity result of an answer the test expects to be one. */
function diversityOf(answer: Answer<JobResult>): DiversityResult {
  if (answer.kind !== "ok") {
    throw new Error(`the answer is ${answer.kind}: ${JSON.stringify(answer)}`);
  }
  const result = answer.value;
  if (result.analysis !== "diversity") {
    throw new Error(`the result is of ${result.analysis}, not diversity`);
  }
  return result;
}

describe("SF1 D1 the filter of the FILTER column in the runner", () => {
  test("on low_qual.vcf.gz, passed alone keeps 900 of 1,200", () => {
    const result = diversityOf(
      opened("low_qual.vcf.gz", VCF_EVERY_VARIANT).run(
        diversityJob([PASSED]),
        ignore,
      ),
    );
    expect(result.passStats).toEqual({
      numVars: 900,
      filtering: { passed: { varsProcessed: 1200, varsKept: 900 } },
    });
  });

  test("on low_qual.vcf.gz, passed, the missing data filter at 0.05 and the MAF filter at 0.95 keep 900, 865 and 847, their counts in that order", () => {
    const result = diversityOf(
      opened("low_qual.vcf.gz", VCF_EVERY_VARIANT).run(
        diversityJob([PASSED, MISSING_DATA, MAF]),
        ignore,
      ),
    );
    expect(result.passStats).toEqual({
      numVars: 847,
      filtering: {
        passed: { varsProcessed: 1200, varsKept: 900 },
        missing_data: { varsProcessed: 900, varsKept: 865 },
        maf: { varsProcessed: 865, varsKept: 847 },
      },
    });
    expect(Object.keys(result.passStats.filtering)).toEqual([
      "passed",
      "missing_data",
      "maf",
    ]);
  });

  test("on low_qual.vcf.gz with the list s000 to s110, popnei's steps are passed, individuals, missing_data and maf, and they keep 900, 797 and 779", () => {
    const putMaf = vi.spyOn(Variants.prototype, "filterByMaf");
    try {
      const result = diversityOf(
        opened("low_qual.vcf.gz", VCF_EVERY_VARIANT).run(
          diversityJob([PASSED, MISSING_DATA, MAF], FIRST_111),
          ignore,
        ),
      );
      expect(putMaf).toHaveBeenCalledTimes(1);
      const [variants] = putMaf.mock.contexts;
      if (!(variants instanceof Variants)) {
        throw new Error("filterByMaf was not called on a Variants");
      }
      expect(variants.steps.map((step) => step.kind)).toEqual([
        "passed",
        "individuals",
        "missing_data",
        "maf",
      ]);
      expect(result.passStats).toEqual({
        numVars: 779,
        filtering: {
          passed: { varsProcessed: 1200, varsKept: 900 },
          missing_data: { varsProcessed: 900, varsKept: 797 },
          maf: { varsProcessed: 797, varsKept: 779 },
        },
      });
    } finally {
      putMaf.mockRestore();
    }
  });

  test("a second run of the same job with passed does not open the file again, and one without passed does", () => {
    const { file, reads } = counted("low_qual.vcf.gz");
    const runner = createRunner();
    expect(runner.open(VCF_EVERY_VARIANT, file).kind).toBe("ok");
    const job = diversityJob([PASSED, MISSING_DATA], FIRST_111);
    diversityOf(runner.run(job, ignore));
    expect(reads()).toBe(1);
    diversityOf(
      runner.run(diversityJob([PASSED, MISSING_DATA], FIRST_111), ignore),
    );
    expect(reads()).toBe(1);
    const without = diversityOf(
      runner.run(diversityJob([MISSING_DATA], FIRST_111), ignore),
    );
    expect(reads()).toBe(2);
    expect(Object.keys(without.passStats.filtering)).toEqual(["missing_data"]);
  });

  test("on panel.vcf.gz, whose variants all passed, passed keeps 1,200 of 1,200", () => {
    const result = diversityOf(
      opened("panel.vcf.gz", VCF_EVERY_VARIANT).run(
        diversityJob([PASSED]),
        ignore,
      ),
    );
    expect(result.passStats).toEqual({
      numVars: 1200,
      filtering: { passed: { varsProcessed: 1200, varsKept: 1200 } },
    });
  });

  test("on panel.nei, a job with passed is refused with popnei's message", () => {
    const answer = opened("panel.nei", NEI).run(diversityJob([PASSED]), ignore);
    expect(answer.kind).toBe("refused");
    expect(answer.kind === "refused" ? answer.message : "").toMatch(
      /^the variants hold no record of whether they passed their FILTER/u,
    );
  });
});

/** What the open of the fixture `name` as `load` answers. */
function openOf(name: string, load: LoadToOpen): Answer<Opened> {
  return createRunner().open(load, { name, source: bytesOf(name) });
}

describe("SF2 D1 whether the variants record their FILTER, at the open", () => {
  test.each([
    ["panel.vcf.gz", { ...VCF_EVERY_VARIANT, readOptions: VCF_ONLY_PASSED }],
    ["panel.vcf.gz", VCF_EVERY_VARIANT],
    ["low_qual.vcf.gz", { ...VCF_EVERY_VARIANT, readOptions: VCF_ONLY_PASSED }],
    ["low_qual.vcf.gz", VCF_EVERY_VARIANT],
    ["low_qual.nei", NEI],
  ])("%s, read options %j, keepsPassed true", (name, load) => {
    const answer = openOf(name, load);
    expect(answer.kind === "ok" ? answer.value.keepsPassed : answer).toBe(true);
  });

  test.each(["panel.nei", "ld.nei", "tetraploid.nei"])(
    "%s, written before popnei's vars format 1.2, keepsPassed false",
    (name) => {
      const answer = openOf(name, NEI);
      expect(answer.kind === "ok" ? answer.value.keepsPassed : answer).toBe(
        false,
      );
    },
  );

  test("low_qual.nei holds the 1,200 variants of low_qual.vcf.gz, 200 individuals of ploidy 2", () => {
    const answer = openOf("low_qual.nei", NEI);
    expect(
      answer.kind === "ok" ? answer.value.individuals.length : answer,
    ).toBe(200);
    expect(answer.kind === "ok" ? answer.value.ploidy : answer).toBe(2);
    const result = diversityOf(
      opened("low_qual.nei", NEI).run(diversityJob([]), ignore),
    );
    expect(result.passStats).toEqual({ numVars: 1200, filtering: {} });
  });

  test("on low_qual.nei, passed alone keeps 900 of 1,200, as on the VCF it was written from", () => {
    const result = diversityOf(
      opened("low_qual.nei", NEI).run(diversityJob([PASSED]), ignore),
    );
    expect(result.passStats).toEqual({
      numVars: 900,
      filtering: { passed: { varsProcessed: 1200, varsKept: 900 } },
    });
  });
});
