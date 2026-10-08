/**
 * The tests of the counts of the filters, from
 * docs/specs/analyses/filterCounts.md, "How it is verified": the rows,
 * the warnings and the check numbers of the counts popnei gave for
 * panel.nei in node on 26 September 2026 with js-v0.1.0-dev.2, the empty
 * pass of the missing data filter at 0.05 and the MAF filter at 0.4, and
 * the three filters of the check numbers. The tests of the key are
 * elsewhere.
 */

import { describe, expect, test } from "vitest";
import {
  filterCountRows,
  filterCounts,
  filterNameInSentence,
  refusalText,
  statisticsFailedText,
} from "./filterCounts.ts";
import { emptyProject } from "../project.ts";
import type { Project, ProjectVariantFilter } from "../project.ts";
import type { WorkerClient } from "../store.ts";
import { deepFreeze } from "../testSupport.ts";
import type {
  FilterCountsJob,
  FilterCountsResult,
  Job,
  JobResult,
  PassStats,
  Run,
  VariantFilter,
} from "../../worker/protocol.ts";

const VARIANTS_ID = "00112233445566778899aabbccddeeff";

/** A project of population genetics, frozen deeply, with a variants file
    `name` read and the filters `filters`; a VCF read with ploidy 2 and
    `onlyPassed` when `onlyPassed` is given. */
function project(
  filters: readonly ProjectVariantFilter[],
  options: { readonly name?: string; readonly onlyPassed?: boolean } = {},
): Project {
  return deepFreeze<Project>({
    ...emptyProject("popgen"),
    variants: {
      fileId: VARIANTS_ID,
      name: options.name ?? "panel.nei",
      size: 261_490,
      format: options.onlyPassed === undefined ? "nei" : "vcf",
      readOptions:
        options.onlyPassed === undefined
          ? null
          : { ploidy: 2, onlyPassed: options.onlyPassed },
      read: {
        kind: "read",
        individuals: ["s000", "s001"],
        ploidy: 2,
        numVars: null,
        keepsPassed: false,
      },
    },
    filters,
  });
}

/** A result of the counts. */
function result(passStats: PassStats): FilterCountsResult {
  return { analysis: "filterCounts", passStats };
}

/** The missing data filter at 0.05 and the MAF filter at 0.4. */
const EMPTY_FILTERS: readonly VariantFilter[] = [
  { kind: "missing_data", maxAllowedMissingRate: 0.05 },
  { kind: "maf", maxAllowedMaf: 0.4 },
];

/** popnei's counts of the empty pass of EMPTY_FILTERS on panel.nei. */
const EMPTY_PASS = result({
  numVars: 0,
  filtering: {
    missing_data: { varsProcessed: 1200, varsKept: 1152 },
    maf: { varsProcessed: 1152, varsKept: 0 },
  },
});

/** The missing data filter at 0.05, the filter by heterozygosity at 0.9
    and the MAF filter at 0.95. */
const THREE_FILTERS: readonly VariantFilter[] = [
  { kind: "missing_data", maxAllowedMissingRate: 0.05 },
  { kind: "obs_het", maxAllowedObsHet: 0.9 },
  { kind: "maf", maxAllowedMaf: 0.95 },
];

/** popnei's counts of THREE_FILTERS on panel.nei. */
const THREE_PASS = result({
  numVars: 1128,
  filtering: {
    missing_data: { varsProcessed: 1200, varsKept: 1152 },
    obs_het: { varsProcessed: 1152, varsKept: 1152 },
    maf: { varsProcessed: 1152, varsKept: 1128 },
  },
});

/** A client that records the jobs it is given and answers none, and gives
    `individuals` as the individuals kept. */
function recordingClient(individuals: readonly string[] | null = null): {
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
    individuals,
  };
  return { client, jobs };
}

describe("IP2 D2 the counts of the filters over the individuals kept", () => {
  test("run sends the filters of the project in their order and the individuals kept that the client gives", () => {
    const { client, jobs } = recordingClient(["s000"]);
    filterCounts.run(project(THREE_FILTERS), client);
    const expected: FilterCountsJob = {
      analysis: "filterCounts",
      fileId: VARIANTS_ID,
      filters: THREE_FILTERS,
      individuals: ["s000"],
    };
    expect(jobs).toEqual([expected]);
  });

  test("run sends individuals null when the client gives null, the filters removing nobody", () => {
    const { client, jobs } = recordingClient(null);
    filterCounts.run(project(THREE_FILTERS), client);
    const expected: FilterCountsJob = {
      analysis: "filterCounts",
      fileId: VARIANTS_ID,
      filters: THREE_FILTERS,
      individuals: null,
    };
    expect(jobs).toEqual([expected]);
  });

  test("filterKeptNone no longer names the statistics of each individual, whose pass has no filter", () => {
    const text = filterCounts.warnings(EMPTY_PASS, project(EMPTY_FILTERS))[0]
      ?.text;
    expect(text).toBe(
      "The MAF filter kept none of the 1,152 variants it was given, so the analyses have no variant to calculate over, and a file written would hold none. Loosen it, or a filter before it.",
    );
    expect(text).not.toMatch(/statistics of each individual/);
  });
});

describe("VS3 D1 the counts of the filters", () => {
  test("filterCountRows of the empty pass gives each filter's counts in the order of the project", () => {
    expect(filterCountRows(EMPTY_PASS, project(EMPTY_FILTERS))).toEqual([
      { kind: "missing_data", given: 1200, kept: 1152 },
      { kind: "maf", given: 1152, kept: 0 },
    ]);
  });

  test("warnings of the empty pass gives filterKeptNone naming the MAF filter", () => {
    expect(filterCounts.warnings(EMPTY_PASS, project(EMPTY_FILTERS))).toEqual([
      {
        code: "filterKeptNone",
        text: "The MAF filter kept none of the 1,152 variants it was given, so the analyses have no variant to calculate over, and a file written would hold none. Loosen it, or a filter before it.",
      },
    ]);
  });

  test("checkNumbers of the three filters gives the variants of the file and what each kept", () => {
    expect(filterCounts.checkNumbers(THREE_PASS)).toEqual([
      1200, 1152, 1152, 1128,
    ]);
    expect(filterCounts.numCheckNumbers(project(THREE_FILTERS))).toBe(4);
  });
});

describe("VS3 D1 the counts of the filters: the rest of the module", () => {
  test("filterCountRows of the three filters, and a defect for a filter with no count", () => {
    expect(filterCountRows(THREE_PASS, project(THREE_FILTERS))).toEqual([
      { kind: "missing_data", given: 1200, kept: 1152 },
      { kind: "obs_het", given: 1152, kept: 1152 },
      { kind: "maf", given: 1152, kept: 1128 },
    ]);
    const withLd = project([
      ...THREE_FILTERS,
      { kind: "ld", maxAllowedR2: 0.5, maxDist: 1000 },
    ]);
    expect(() => filterCountRows(THREE_PASS, withLd)).toThrow(
      "popnei_web defect: the counts of the filters have no count of ld.",
    );
  });

  test("warnings of counts where every filter kept some is none", () => {
    expect(filterCounts.warnings(THREE_PASS, project(THREE_FILTERS))).toEqual(
      [],
    );
  });

  test("warnings of a first filter that kept none tells to loosen it alone", () => {
    const r = result({
      numVars: 0,
      filtering: { missing_data: { varsProcessed: 1200, varsKept: 0 } },
    });
    const filters: readonly VariantFilter[] = [
      { kind: "missing_data", maxAllowedMissingRate: 0 },
    ];
    expect(filterCounts.warnings(r, project(filters))).toEqual([
      {
        code: "filterKeptNone",
        text: "The filter of the variants by missing data kept none of the 1,200 variants it was given, so the analyses have no variant to calculate over, and a file written would hold none. Loosen it.",
      },
    ]);
  });

  test("warnings name the first filter that kept none, not the one after it, given none", () => {
    const r = result({
      numVars: 0,
      filtering: {
        missing_data: { varsProcessed: 1200, varsKept: 0 },
        maf: { varsProcessed: 0, varsKept: 0 },
      },
    });
    expect(
      filterCounts.warnings(r, project(EMPTY_FILTERS)).map((w) => w.text),
    ).toEqual([
      "The filter of the variants by missing data kept none of the 1,200 variants it was given, so the analyses have no variant to calculate over, and a file written would hold none. Loosen it.",
    ]);
  });

  test("warnings of a filter given one variant, which it did not keep, says the one variant", () => {
    const r = result({
      numVars: 0,
      filtering: {
        missing_data: { varsProcessed: 3, varsKept: 1 },
        maf: { varsProcessed: 1, varsKept: 0 },
      },
    });
    expect(
      filterCounts.warnings(r, project(EMPTY_FILTERS)).map((w) => w.text),
    ).toEqual([
      "The MAF filter kept none of the one variant it was given, so the analyses have no variant to calculate over, and a file written would hold none. Loosen it, or a filter before it.",
    ]);
  });

  test("warnings of a file that gave no variant, with no filter, gives noVariant", () => {
    const r = result({ numVars: 0, filtering: {} });
    expect(
      filterCounts.warnings(
        r,
        project([], { name: "empty.vcf", onlyPassed: false }),
      ),
    ).toEqual([
      {
        code: "noVariant",
        text: "empty.vcf has no variants. Load another variants file.",
      },
    ]);
  });

  test("warnings of a VCF read with only the passed variants, whose first filter was given none, tells to untick the box", () => {
    const r = result({
      numVars: 0,
      filtering: { missing_data: { varsProcessed: 0, varsKept: 0 } },
    });
    const filters: readonly VariantFilter[] = [
      { kind: "missing_data", maxAllowedMissingRate: 0.05 },
    ];
    expect(
      filterCounts.warnings(
        r,
        project(filters, { name: "failed.vcf", onlyPassed: true }),
      ),
    ).toEqual([
      {
        code: "noVariant",
        text: 'failed.vcf has no variant with PASS or . in its FILTER column, and it was read with only those. Untick "Only the variants with PASS or . in the FILTER column" and read the file again.',
      },
    ]);
  });

  test("checkNumbers with no filter gives the variants of the file alone", () => {
    const r = result({ numVars: 1200, filtering: {} });
    expect(filterCounts.checkNumbers(r)).toEqual([1200]);
    expect(filterCounts.numCheckNumbers(project([]))).toBe(1);
  });

  test("the definition reads both lists of filters, and has no key input, no reason and no option", () => {
    expect(filterCounts.id).toBe("filterCounts");
    expect(filterCounts.app).toEqual(["popgen", "gwas"]);
    expect(filterCounts.keyVersion).toBe(2);
    expect(filterCounts.filtersRead).toEqual({
      variants: true,
      individuals: true,
    });
    expect(filterCounts.defaults).toEqual({});
    expect(filterCounts.keyInputs(project([]))).toBeNull();
    expect(filterCounts.needs(project([]))).toBeNull();
    expect(filterCounts.parseOptions({}, 1)).toEqual({ ok: true, value: {} });
    expect(filterCounts.parseOptions(null, 1)).toEqual({
      ok: false,
      error: "no option",
    });
  });

  test("script gives the lines of the spec", () => {
    expect(filterCounts.script(project([]))).toBe(
      "# How many variants each filter was given and kept\n" +
        "blocks = variants.iter_blocks()\n" +
        "for _ in blocks:\n" +
        "    pass\n" +
        "print(blocks.pass_stats)\n",
    );
  });
});

describe("VS6 D2 the name of a filter of the variants inside a sentence", () => {
  test("each of the four, as the lines of the histograms and the descriptions of the commands name them", () => {
    expect(filterNameInSentence("missing_data")).toBe(
      "the filter of the variants by missing data",
    );
    expect(filterNameInSentence("obs_het")).toBe(
      "the filter of the variants by observed heterozygosity",
    );
    expect(filterNameInSentence("maf")).toBe("the MAF filter");
    expect(filterNameInSentence("ld")).toBe("the LD pruning");
  });
});

describe("VS3 D1 the counts of the filters: refusalText", () => {
  test("a genotype of another ploidy tells to set the ploidy", () => {
    const message =
      "line 5 of the VCF, the column of t00: its genotype is of the ploidy 4 and the variants are read with the ploidy 2";
    expect(
      refusalText(
        message,
        project([], { name: "tetraploid.vcf.gz", onlyPassed: true }),
      ),
    ).toBe(
      "At line 5 of tetraploid.vcf.gz, the genotype of t00 has 4 alleles, and the file was read with ploidy 2. If every genotype of the file has 4 alleles, set the ploidy of the VCF to 4 in the Variants step and read the file again. A file that mixes ploidies, such as one with the X of males haploid among diploid autosomes, cannot be read in this version.",
    );
  });

  test("a genotype of another ploidy in the words of popnei's main of 6 October 2026 tells the same", () => {
    const message =
      "line 5 of the VCF, the column of t00: its genotype is of the ploidy 4 and the variants are read with the ploidy 2; popnei does not read a VCF whose genotypes are of different ploidies";
    expect(
      refusalText(
        message,
        project([], { name: "tetraploid.vcf.gz", onlyPassed: true }),
      ),
    ).toMatch(
      /^At line 5 of tetraploid\.vcf\.gz, the genotype of t00 has 4 alleles, and the file was read with ploidy 2\./u,
    );
  });

  test("another message gives popnei's message without its full stop, and to count again", () => {
    expect(refusalText("out of memory.", project([]))).toBe(
      "popnei could not count the variants: out of memory. Change the settings, or load the variants file again, to count again.",
    );
  });

  test("a file of no variant says there is no variant to count, as the owner decided on 27 September 2026", () => {
    expect(
      refusalText(
        "the pass gave no variant and its source holds none",
        project([]),
      ),
    ).toBe(
      "panel.nei has no variants, so there is no variant to count. Load another variants file in the Variants step.",
    );
  });

  test("an empty pass gets the words of any other refusal", () => {
    expect(
      refusalText(
        "the pass gave no variant: the filters kept none of the 1200 variants",
        project([]),
      ),
    ).toBe(
      "popnei could not count the variants: the pass gave no variant: the filters kept none of the 1200 variants. Change the settings, or load the variants file again, to count again.",
    );
  });

  test("any other refusal gives popnei's message without its backquotes, as the diversity's table does", () => {
    expect(
      refusalText("the `maf` filter was given no variant.", project([])),
    ).toBe(
      "popnei could not count the variants: the maf filter was given no variant. Change the settings, or load the variants file again, to count again.",
    );
  });
});

describe("IP2 D3 the words of the statistics of each individual that a Calculate or a Count waited for, refused or failed", () => {
  test("popnei's refusal of the statistics is told in their words, and not in the words of this part", () => {
    expect(
      statisticsFailedText(
        { kind: "refused", message: "memory could not grow" },
        project([]),
        () => {
          throw new Error("a refusal was given the words of a failure");
        },
      ),
    ).toBe(
      "The statistics of each individual, which the thresholds of the individuals need, could not be calculated, so the variants were not counted. popnei could not calculate the statistics of each individual: memory could not grow. Change the settings, or load the variants file again, to calculate them again.",
    );
  });

  test("another failure of the statistics is told in the words the frame gives it", () => {
    const failure = { kind: "workerFailed", message: "a trap" } as const;
    expect(
      statisticsFailedText(
        { kind: "failed", error: failure },
        project([]),
        (f) =>
          f === failure ? "The calculation stopped unexpectedly." : "wrong",
      ),
    ).toBe(
      "The statistics of each individual, which the thresholds of the individuals need, could not be calculated, so the variants were not counted. The calculation stopped unexpectedly.",
    );
  });
});

describe("IP3 D1 the filters of the job of the counts", () => {
  test("run sends the filters of the project, the same array, the LD filter with its distance", () => {
    const p = project([
      ...THREE_FILTERS,
      { kind: "ld", maxAllowedR2: 0.3, maxDist: 50000 },
    ]);
    const { client, jobs } = recordingClient(null);
    filterCounts.run(p, client);
    expect(jobs[0]?.filters).toBe(p.filters);
  });

  test("run of a project whose LD filter has no distance is a defect, and sends nothing", () => {
    const p = project([
      ...THREE_FILTERS,
      { kind: "ld", maxAllowedR2: 0.3, maxDist: null },
    ]);
    const { client, jobs } = recordingClient(null);
    expect(() => filterCounts.run(p, client)).toThrow(/^popnei_web defect: /);
    expect(jobs).toStrictEqual([]);
  });
});
