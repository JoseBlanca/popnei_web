/**
 * The runner's count of the FILTER failures in node, over the fixtures of
 * e2e/fixtures/ given as bytes (docs/plans/live-stats.md, "The phases",
 * 3). The numbers are popnei's js-v0.2.1 under node on 7 October 2026,
 * `calcVarDensity(variants, 2**53 - 1, {chromLengths: {}})` after
 * `filterPassed()` on each VCF opened with `{onlyPassed: false}`:
 * low_qual.vcf.gz gave `passed` 1,200 given and 900 kept, 300 failures
 * with FILTER LowQual; panel.vcf.gz 1,200 and 1,200; and on panel.nei
 * popnei refused the pass, "the variants hold no record of whether they
 * passed their FILTER...".
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeAll, describe, expect, test } from "vitest";

import type {
  FilterFailuresJob,
  JobResult,
  PassStats,
  VariantsSummaryJob,
} from "./protocol.ts";
import { createRunner, loadPopnei } from "./runner.ts";
import type { Answer, LoadToOpen, Runner } from "./runner.ts";
import { INSTALLED_POPNEI_VERSION } from "./testSupport.ts";

const FIXTURES = join(import.meta.dirname, "..", "..", "e2e", "fixtures");
const FILE_ID = "load-1";
const JOB: FilterFailuresJob = {
  analysis: "filterFailures",
  fileId: FILE_ID,
  filters: [],
};
const SUMMARY_JOB: VariantsSummaryJob = {
  analysis: "variantsSummary",
  fileId: FILE_ID,
  filters: [],
  minNumIndividuals: 0,
  numBins: 1280,
  range: [0, 1],
};

/** A runner with the fixture `name` opened as popgen2.html opens it: a
    `.nei` file, or a VCF with every variant and the ploidy read from the
    file. */
function opened(name: string): Runner {
  const load: LoadToOpen = name.endsWith(".nei")
    ? { fileId: FILE_ID, format: "nei", readOptions: null }
    : {
        fileId: FILE_ID,
        format: "vcf",
        readOptions: { ploidy: null, onlyPassed: false },
      };
  const runner = createRunner();
  const source = new Uint8Array(readFileSync(join(FIXTURES, name)));
  expect(runner.open(load, { name, source }).kind).toBe("ok");
  return runner;
}

function ignore(): void {
  // The progress, which these tests do not look at.
}

/** The counts of an answer that has to be a count of the FILTER
    failures. */
function countsOf(answer: Answer<JobResult>): PassStats {
  if (answer.kind !== "ok") {
    throw new Error(`the answer is ${answer.kind}: ${JSON.stringify(answer)}`);
  }
  if (answer.value.analysis !== "filterFailures") {
    throw new Error(`the result is of ${answer.value.analysis}`);
  }
  return answer.value.passStats;
}

beforeAll(async () => {
  expect(await loadPopnei()).toEqual({
    ok: true,
    value: INSTALLED_POPNEI_VERSION,
  });
});

describe("live-stats 3 the runner's count of the FILTER failures", () => {
  test("low_qual.vcf.gz: 1,200 variants given to passed, 900 kept, so 300 failed", () => {
    expect(countsOf(opened("low_qual.vcf.gz").run(JOB, ignore))).toEqual({
      numVars: 900,
      filtering: { passed: { varsProcessed: 1200, varsKept: 900 } },
    });
  });

  test("panel.vcf.gz: every one of its 1,200 variants passed", () => {
    expect(countsOf(opened("panel.vcf.gz").run(JOB, ignore))).toEqual({
      numVars: 1200,
      filtering: { passed: { varsProcessed: 1200, varsKept: 1200 } },
    });
  });

  test("after the summary, over the same load, and the summary again after it, each with its own steps", () => {
    const runner = opened("low_qual.vcf.gz");
    const summary = runner.run(SUMMARY_JOB, ignore);
    expect(summary.kind === "ok" && summary.value.passStats).toEqual({
      numVars: 1200,
      filtering: {},
    });
    expect(countsOf(runner.run(JOB, ignore)).filtering).toEqual({
      passed: { varsProcessed: 1200, varsKept: 900 },
    });
    const again = runner.run(SUMMARY_JOB, ignore);
    expect(again.kind === "ok" && again.value.passStats).toEqual({
      numVars: 1200,
      filtering: {},
    });
  });

  test("a .nei file, which the page never sends, is refused by popnei", () => {
    const answer = opened("panel.nei").run(JOB, ignore);
    expect(answer.kind).toBe("refused");
    expect(answer.kind === "refused" && answer.message).toContain(
      "hold no record of whether they passed their FILTER",
    );
  });
});
