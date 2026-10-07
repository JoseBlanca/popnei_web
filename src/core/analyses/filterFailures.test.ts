/**
 * The tests of the count of the FILTER failures, from
 * docs/plans/live-stats.md, phase 3: the request, the reason it is not
 * run on a `.nei` file, the key, the check number, the variants of the
 * file its counts give, and the lines of the Python script. The counts are
 * those popnei js-v0.2.1 gave under node for low_qual.vcf.gz on 7 October
 * 2026: `passed` given 1,200 variants, 900 kept.
 */

import { describe, expect, test } from "vitest";

import { countsOf } from "../apps.ts";
import { createKeyMemo, keyOf } from "../keys.ts";
import type { Key } from "../keys.ts";
import { emptyProject } from "../project.ts";
import type { Project } from "../project.ts";
import type { WorkerClient } from "../store.ts";
import { deepFreeze } from "../testSupport.ts";
import type {
  FilterFailuresJob,
  FilterFailuresResult,
  Job,
  JobResult,
  Run,
  VariantFilter,
} from "../../worker/protocol.ts";
import { variantsOfFile } from "./filterCounts.ts";
import { filterFailures, numFilterFailures } from "./filterFailures.ts";
import { variantsSummary } from "./variantsSummary.ts";

const VARIANTS_ID = "00112233445566778899aabbccddeeff";
const OTHER_VARIANTS_ID = "0123456789abcdef0123456789abcdef";

/** A project of population genetics, frozen deeply, with the variants file
    `name` read: a `.nei` file when its name ends so, or else a VCF of
    every variant with the ploidy read from the file. */
function project(
  options: {
    readonly name?: string;
    readonly fileId?: string;
    readonly filters?: readonly VariantFilter[];
    readonly onlyPassed?: boolean;
  } = {},
): Project {
  const name = options.name ?? "low_qual.vcf.gz";
  const isNei = name.endsWith(".nei");
  return deepFreeze<Project>({
    ...emptyProject("popgen"),
    variants: {
      fileId: options.fileId ?? VARIANTS_ID,
      name,
      size: 30_000,
      format: isNei ? "nei" : "vcf",
      readOptions: isNei
        ? null
        : { ploidy: null, onlyPassed: options.onlyPassed ?? false },
      read: {
        kind: "read",
        individuals: ["s000", "s001"],
        ploidy: 2,
        numVars: null,
      },
    },
    filters: options.filters ?? [],
  });
}

/** The count of low_qual.vcf.gz. */
const LOW_QUAL: FilterFailuresResult = {
  analysis: "filterFailures",
  passStats: {
    numVars: 900,
    filtering: { passed: { varsProcessed: 1200, varsKept: 900 } },
  },
};

/** A client that records the jobs it is given and answers none. */
function recordingClient(): {
  readonly client: WorkerClient<Job, JobResult>;
  readonly jobs: Job[];
} {
  const jobs: Job[] = [];
  const client: WorkerClient<Job, JobResult> = {
    run(job: Job): Run<JobResult> {
      jobs.push(job);
      return {
        id: 1,
        outcome: Promise.resolve({ kind: "cancelled" }),
        cancel: () => undefined,
      };
    },
    intermediateKey: () => "",
    individuals: null,
  };
  return { client, jobs };
}

function keyFor(p: Project): Key {
  return keyOf(filterFailures, p, "0.2.1", createKeyMemo());
}

describe("live-stats 3 the count of the FILTER failures: the request", () => {
  test("run sends the load and no filter, whatever the filters of the project", () => {
    const { client, jobs } = recordingClient();
    filterFailures.run(
      project({
        filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.1 }],
      }),
      client,
    );
    const expected: FilterFailuresJob = {
      analysis: "filterFailures",
      fileId: VARIANTS_ID,
      filters: [],
    };
    expect(jobs).toEqual([expected]);
  });

  test("run with no variants file throws a defect", () => {
    const { client } = recordingClient();
    expect(() =>
      filterFailures.run(deepFreeze(emptyProject("popgen")), client),
    ).toThrow(/^popnei_web defect: /u);
  });

  test("the definition is of population genetics alone, reads no filter, and has no key input, no option and no warning", () => {
    expect(filterFailures.id).toBe("filterFailures");
    expect(filterFailures.app).toEqual(["popgen"]);
    expect(filterFailures.keyVersion).toBe(1);
    expect(filterFailures.filtersRead).toEqual({
      variants: false,
      individuals: false,
    });
    expect(filterFailures.warnings(LOW_QUAL, project())).toEqual([]);
    expect(filterFailures.parseOptions({}, 1)).toEqual({
      ok: true,
      value: {},
    });
  });

  test("a VCF needs nothing more; a .nei file is locked, with words that say why", () => {
    expect(filterFailures.needs(project())).toBeNull();
    expect(filterFailures.needs(deepFreeze(emptyProject("popgen")))).toBe(null);
    expect(filterFailures.needs(project({ name: "panel.nei" }))).toBe(
      "The variants of panel.nei that failed their FILTER are not counted: a .nei file written before format 1.2 holds no FILTER, and the page cannot tell its format.",
    );
  });

  test("a VCF read without its failed variants is locked, with words that say why", () => {
    expect(
      filterFailures.needs(project({ name: "panel.vcf.gz", onlyPassed: true })),
    ).toBe(
      "The variants of panel.vcf.gz that failed their FILTER are not counted: the file was read without them.",
    );
  });
});

describe("live-stats 3 the count of the FILTER failures: the key", () => {
  test("a new load changes the key, a filter of the project does not, and it is not the summary's", () => {
    const base = keyFor(project());
    expect(keyFor(project({ fileId: OTHER_VARIANTS_ID }))).not.toBe(base);
    expect(
      keyFor(project({ filters: [{ kind: "maf", maxAllowedMaf: 0.95 }] })),
    ).toBe(base);
    expect(
      keyOf(variantsSummary, project(), "0.2.1", createKeyMemo()),
    ).not.toBe(base);
  });
});

describe("live-stats 3 the count of the FILTER failures: the result", () => {
  test("low_qual.vcf.gz: 300 failures, the one check number", () => {
    expect(numFilterFailures(LOW_QUAL)).toBe(300);
    expect(filterFailures.checkNumbers(LOW_QUAL)).toEqual([300]);
    expect(filterFailures.numCheckNumbers(project())).toBe(1);
  });

  test("its counts give every variant as the variants of the file, not those that passed", () => {
    expect(variantsOfFile(LOW_QUAL.passStats)).toBe(1200);
    expect(countsOf(LOW_QUAL)).toEqual({ numVarsRead: 1200, counts: null });
  });

  test("passed comes first in the variants of the file, whatever the order of the fields", () => {
    expect(
      variantsOfFile({
        numVars: 850,
        filtering: {
          missing_data: { varsProcessed: 900, varsKept: 850 },
          passed: { varsProcessed: 1200, varsKept: 900 },
        },
      }),
    ).toBe(1200);
  });

  test("a result of another analysis, or with no counts of passed, is a defect", () => {
    expect(() =>
      numFilterFailures({
        analysis: "filterCounts",
        passStats: { numVars: 1, filtering: {} },
      }),
    ).toThrow(/^popnei_web defect: /u);
    expect(() =>
      numFilterFailures({
        analysis: "filterFailures",
        passStats: { numVars: 1, filtering: {} },
      }),
    ).toThrow(/^popnei_web defect: /u);
  });
});

describe("live-stats 3 the count of the FILTER failures: the Python script", () => {
  test("opens the VCF with every variant, keeps those that passed, reads its blocks to the end, also when none passed, and prints the difference of popnei's counts", () => {
    expect(filterFailures.script(project())).toBe(
      [
        "# The variants that failed their FILTER: neither PASS nor a dot",
        'variants_passed = popnei.open_vcf("low_qual.vcf.gz", only_passed=False)',
        "variants_passed.filter_passed()",
        "passed_blocks = variants_passed.iter_blocks(fields=())",
        "for _ in passed_blocks:",
        "    pass",
        'passed_counts = passed_blocks.pass_stats.filtering["passed"]',
        'print("Failed their FILTER:", passed_counts.vars_processed - passed_counts.vars_kept)',
        "",
      ].join("\n"),
    );
  });
});
