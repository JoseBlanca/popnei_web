/**
 * The tests of the summary of the variants file, from
 * docs/plans/open-variants.md, "The phases", 1: the request, the key, the
 * check numbers, the rows of the chromosomes and the lines of the Python
 * script. The numbers of the results are those popnei gave for ld.vcf.gz
 * and panel.nei, in Python and in node, on 5 October 2026: 250 variants on
 * chr1 and 250 on chr2, and 1,200 on the chromosome 1.
 */

import { describe, expect, test } from "vitest";
import { chromRows, variantsSummary } from "./variantsSummary.ts";
import { createKeyMemo, keyOf } from "../keys.ts";
import type { Key, KeyedDef } from "../keys.ts";
import { emptyProject } from "../project.ts";
import type { Project, VariantSource } from "../project.ts";
import type { WorkerClient } from "../store.ts";
import { deepFreeze } from "../testSupport.ts";
import type {
  FilterCountsResult,
  IndividualFilter,
  Job,
  JobResult,
  Run,
  VariantFilter,
  VariantsSummaryJob,
  VariantsSummaryResult,
} from "../../worker/protocol.ts";

const VARIANTS_ID = "00112233445566778899aabbccddeeff";
const OTHER_VARIANTS_ID = "0123456789abcdef0123456789abcdef";

/** A project of population genetics, frozen deeply, with the variants file
    `name` read, a VCF of `ploidy` and `onlyPassed` when `onlyPassed` is
    given, and the filters given. */
function project(
  options: {
    readonly name?: string;
    readonly fileId?: string;
    readonly onlyPassed?: boolean;
    readonly ploidy?: number;
    readonly filters?: readonly VariantFilter[];
    readonly individualFilters?: readonly IndividualFilter[];
  } = {},
): Project {
  return deepFreeze<Project>({
    ...emptyProject("popgen"),
    variants: {
      fileId: options.fileId ?? VARIANTS_ID,
      name: options.name ?? "panel.nei",
      size: 261_490,
      format: options.onlyPassed === undefined ? "nei" : "vcf",
      readOptions:
        options.onlyPassed === undefined
          ? null
          : { ploidy: options.ploidy ?? 2, onlyPassed: options.onlyPassed },
      read: {
        kind: "read",
        individuals: ["s000", "s001"],
        ploidy: options.ploidy ?? 2,
        numVars: null,
      },
    },
    filters: options.filters ?? [],
    individualFilters: options.individualFilters ?? [],
  });
}

/** The summary of ld.vcf.gz. */
const LD: VariantsSummaryResult = {
  analysis: "variantsSummary",
  chroms: ["chr1", "chr2"],
  numVarsPerChrom: Uint32Array.of(250, 250),
  passStats: { numVars: 500, filtering: {} },
};

/** The summary of panel.nei. */
const PANEL: VariantsSummaryResult = {
  analysis: "variantsSummary",
  chroms: ["1"],
  numVarsPerChrom: Uint32Array.of(1200),
  passStats: { numVars: 1200, filtering: {} },
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

/** The key of the summary for `p`, with popnei 0.1.0 unless another
    version is given. */
function keyFor(p: Project, popneiVersion = "0.1.0"): Key {
  return keyOf(variantsSummary, p, popneiVersion, createKeyMemo());
}

/** A copy of `p` whose `variants` is a getter that throws, so that a test
    sees any read of it. */
function withVariantsUnreadable(p: Project): Project {
  const copy: Project = { ...p };
  Object.defineProperty(copy, "variants", {
    get(): never {
      throw new Error("keyInputs read p.variants");
    },
  });
  return copy;
}

/** The variants file of `p`, which the projects of these tests have. */
function variantsOf(p: Project): VariantSource {
  if (p.variants === null) {
    throw new Error("the project of the test has a variants file");
  }
  return p.variants;
}

describe("open-variants 1 the summary of the variants file: the request", () => {
  test("run sends the load and no filter, whatever the filters of the project", () => {
    const { client, jobs } = recordingClient();
    variantsSummary.run(
      project({
        filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.05 }],
        individualFilters: [{ kind: "remove", individuals: ["s001"] }],
      }),
      client,
    );
    const expected: VariantsSummaryJob = {
      analysis: "variantsSummary",
      fileId: VARIANTS_ID,
      filters: [],
    };
    expect(jobs).toEqual([expected]);
  });

  test("run with no variants file throws a defect", () => {
    const { client } = recordingClient();
    expect(() =>
      variantsSummary.run(deepFreeze(emptyProject("popgen")), client),
    ).toThrow(/^popnei_web defect: /u);
  });

  test("the definition reads no filter, and has no key input, no reason, no option and no warning", () => {
    expect(variantsSummary.id).toBe("variantsSummary");
    expect(variantsSummary.app).toEqual(["popgen", "gwas"]);
    expect(variantsSummary.keyVersion).toBe(1);
    expect(variantsSummary.filtersRead).toEqual({
      variants: false,
      individuals: false,
    });
    expect(variantsSummary.defaults).toEqual({});
    expect(variantsSummary.needs(project())).toBeNull();
    expect(variantsSummary.warnings(LD, project())).toEqual([]);
    expect(variantsSummary.parseOptions({}, 1)).toEqual({
      ok: true,
      value: {},
    });
    expect(variantsSummary.parseOptions({ windowSize: 1000 }, 1)).toEqual({
      ok: false,
      error: "no option",
    });
  });
});

describe("open-variants 1 the summary of the variants file: the key", () => {
  const base = project({ onlyPassed: true });
  const baseKey = keyFor(base);

  test("a new load of the file, the same file included, or the ploidy or onlyPassed of a VCF, changes the key", () => {
    const keys = [
      baseKey,
      keyFor(project({ onlyPassed: true, fileId: OTHER_VARIANTS_ID })),
      keyFor(project({ onlyPassed: true, ploidy: 4 })),
      keyFor(project({ onlyPassed: false })),
    ];
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("a filter of the variants or of the individuals, or an individuals file, leaves the key the same", () => {
    const changed: readonly Project[] = [
      project({
        onlyPassed: true,
        filters: [{ kind: "maf", maxAllowedMaf: 0.95 }],
      }),
      project({
        onlyPassed: true,
        individualFilters: [
          { kind: "missing_data", maxAllowedMissingRate: 0.03 },
        ],
      }),
      deepFreeze<Project>({
        ...base,
        grouping: { kind: "populations", column: "pop" },
      }),
    ];
    for (const p of changed) {
      expect(keyFor(p)).toBe(baseKey);
    }
  });

  test("the key version, 1, and the version of popnei change the key", () => {
    const later: KeyedDef = { ...variantsSummary, keyVersion: 2 };
    expect(keyOf(later, base, "0.1.0", createKeyMemo())).not.toBe(baseKey);
    expect(keyFor(base, "0.2.0")).not.toBe(baseKey);
  });

  test("keyInputs gives null for the empty project and for a pending read, without reading p.variants", () => {
    expect(
      variantsSummary.keyInputs(withVariantsUnreadable(emptyProject("popgen"))),
    ).toBeNull();
    const pending = deepFreeze<Project>({
      ...base,
      variants: { ...variantsOf(base), read: { kind: "pending" } },
    });
    expect(variantsSummary.keyInputs(withVariantsUnreadable(pending))).toBe(
      null,
    );
  });
});

describe("open-variants 1 the summary of the variants file: the numbers", () => {
  test("checkNumbers of panel.nei gives its 1,200 variants, and there is one for every project", () => {
    expect(variantsSummary.checkNumbers(PANEL)).toEqual([1200]);
    expect(variantsSummary.numCheckNumbers(project())).toBe(1);
  });

  test("chromRows of ld.vcf.gz gives chr1 and chr2 in popnei's order, 250 variants each", () => {
    expect(chromRows(LD)).toEqual([
      { chrom: "chr1", numVars: 250 },
      { chrom: "chr2", numVars: 250 },
    ]);
  });

  test("chromRows of a result of another analysis, or of counts fewer than the chromosomes, throws a defect", () => {
    const counts: FilterCountsResult = {
      analysis: "filterCounts",
      passStats: PANEL.passStats,
    };
    expect(() => chromRows(counts)).toThrow(/^popnei_web defect: /u);
    expect(() => variantsSummary.checkNumbers(counts)).toThrow(
      /^popnei_web defect: /u,
    );
    expect(() =>
      chromRows({ ...LD, numVarsPerChrom: Uint32Array.of(250) }),
    ).toThrow(/^popnei_web defect: /u);
  });
});

describe("open-variants 1 the summary of the variants file: the script", () => {
  test("script of a .nei file opens it with open_vars and counts the variants of each chromosome in one window", () => {
    expect(variantsSummary.script(project())).toBe(
      "# The variants of the file on each chromosome, one window per chromosome\n" +
        'variants_as_read = popnei.open_vars("panel.nei")\n' +
        "variants_summary = popnei.calc_var_density(\n" +
        "    variants_as_read,\n" +
        "    9007199254740991,\n" +
        "    chrom_lengths={},\n" +
        ")\n" +
        'print(variants_summary.windows[["chrom", "num_vars"]].to_string())\n',
    );
  });

  test("script of a VCF opens it with open_vcf and its read options", () => {
    const lines = variantsSummary
      .script(project({ name: "panel.vcf.gz", onlyPassed: false, ploidy: 4 }))
      .split("\n");
    expect(lines[1]).toBe(
      'variants_as_read = popnei.open_vcf("panel.vcf.gz", ploidy=4, only_passed=False)',
    );
  });

  test("script with no variants file throws a defect", () => {
    expect(() =>
      variantsSummary.script(deepFreeze(emptyProject("popgen"))),
    ).toThrow(/^popnei_web defect: /u);
  });
});
