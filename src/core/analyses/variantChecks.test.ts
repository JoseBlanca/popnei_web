/**
 * The tests of the histograms of the variants, from
 * docs/specs/analyses/variantChecks.md, "How it is verified": the request,
 * the warning of the variants with no call, the check numbers and the two
 * descriptions of docs/specs/charts/histogram.md, "The numbers without the
 * picture", on the numbers popnei gave for panel.nei in node on 26
 * September 2026 with js-v0.1.0-dev.2. The tests of the key are
 * elsewhere.
 */

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  VARIANT_BINS,
  VARIANT_FINE_BINS,
  binsCsvName,
  summed,
  refusalText,
  statisticsFailedText,
  variantBins,
  variantBinsRounded,
  variantChecks,
  variantHistogramDescription,
} from "./variantChecks.ts";
import type { VariantStatistic } from "./variantChecks.ts";
import { binsCsv, splitBinText } from "./words.ts";
import type { DescribedBin } from "./words.ts";
import { emptyProject } from "../project.ts";
import type { Project } from "../project.ts";
import type { WorkerClient } from "../store.ts";
import { deepFreeze } from "../testSupport.ts";
import type {
  Job,
  JobResult,
  Run,
  VariantChecksJob,
  VariantChecksResult,
  IndividualFilter,
  VariantFilter,
} from "../../worker/protocol.ts";

const VARIANTS_ID = "00112233445566778899aabbccddeeff";

/** A project of population genetics, frozen deeply, with a variants file
    `name` read and the filters `filters`; a VCF read with ploidy `ploidy`
    and `onlyPassed` when `onlyPassed` is given. */
function project(
  options: {
    readonly name?: string;
    readonly filters?: readonly VariantFilter[];
    readonly onlyPassed?: boolean;
    readonly ploidy?: number;
    readonly individualFilters?: readonly IndividualFilter[];
  } = {},
): Project {
  const isVcf = options.onlyPassed !== undefined;
  return deepFreeze<Project>({
    ...emptyProject("popgen"),
    variants: {
      fileId: VARIANTS_ID,
      name: options.name ?? "panel.nei",
      size: 261_490,
      format: isVcf ? "vcf" : "nei",
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

/** The thresholds of the flow of the Variants step on the individuals,
    0.03 of missing genotypes and 0.38 of observed heterozygosity. */
const THRESHOLDS: readonly IndividualFilter[] = [
  { kind: "missing_data", maxAllowedMissingRate: 0.03 },
  { kind: "obs_het", maxAllowedObsHet: 0.38 },
];

/** The 41 edges of popnei's 40 bins over 0 to 1, the decimals i / 40
    since popnei 0.2.2. */
const EDGES = Float64Array.from({ length: 41 }, (_, i) => i / 40);

/** The MAF counts of panel.nei: twenty zeros, then those of the spec. */
const PANEL_MAF = [
  ...Array.from({ length: 20 }, () => 0),
  69,
  75,
  62,
  71,
  60,
  74,
  72,
  81,
  72,
  68,
  64,
  83,
  64,
  63,
  67,
  57,
  48,
  25,
  22,
  3,
];

/** The counts of the observed heterozygosity of panel.nei: those of the
    spec, then fifteen zeros. */
const PANEL_OBS_HET = [
  0,
  4,
  9,
  18,
  20,
  25,
  30,
  34,
  50,
  61,
  53,
  69,
  62,
  84,
  89,
  101,
  113,
  102,
  108,
  58,
  62,
  27,
  14,
  5,
  2,
  ...Array.from({ length: 15 }, () => 0),
];

/** The result of panel.nei; the counts of the expected heterozygosity,
    which no test reads, are those of the MAF. The missing rate is
    popnei 0.2.0's, under node. */
const PANEL: VariantChecksResult = {
  analysis: "variantChecks",
  binEdges: EDGES,
  missingRate: {
    mean: 0.02969999999999999,
    counts: Uint32Array.from([
      345,
      768,
      86,
      1,
      ...Array.from({ length: 36 }, () => 0),
    ]),
  },
  maf: { mean: 0.7163445463101891, counts: Uint32Array.from(PANEL_MAF) },
  obsHet: {
    mean: 0.35429523451520484,
    counts: Uint32Array.from(PANEL_OBS_HET),
  },
  unbiasedExpHet: {
    mean: 0.3754712450806149,
    counts: Uint32Array.from(PANEL_MAF),
  },
  passStats: { numVars: 1200, filtering: {} },
};

/** The rows of `counts` over EDGES, as `histogramRows` gives them for a
    threshold that keeps the bins before `firstRemoved` and removes the
    rest, but for `split`, partly kept. */
function binsOf(
  counts: readonly number[],
  firstRemoved: number,
  split: number | null = null,
): DescribedBin[] {
  return counts.map((count, i) => ({
    from: EDGES[i] ?? NaN,
    to: EDGES[i + 1] ?? NaN,
    count,
    state: i === split ? "partlyKept" : i < firstRemoved ? "kept" : "removed",
  }));
}

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

describe("IP2 D2 the histograms of the variants over the individuals kept", () => {
  test("run sends the job of the spec with the individuals kept that the client gives, and no filter of the variants whatever the project's", () => {
    const { client, jobs } = recordingClient(["s000"]);
    variantChecks.run(
      project({
        filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.05 }],
        individualFilters: THRESHOLDS,
      }),
      client,
    );
    const expected: VariantChecksJob = {
      analysis: "variantChecks",
      fileId: VARIANTS_ID,
      filters: [],
      individuals: ["s000"],
      minNumIndividuals: 0,
      numBins: 1280,
      range: [0, 1],
    };
    expect(jobs).toEqual([expected]);
  });

  test("run sends individuals null when the client gives null, the filters removing nobody", () => {
    const { client, jobs } = recordingClient(null);
    variantChecks.run(project({ individualFilters: THRESHOLDS }), client);
    expect(jobs).toEqual([
      expect.objectContaining({ analysis: "variantChecks", individuals: null }),
    ]);
  });

  test("warnings with a filter of individuals say the variants have no called genotype among the individuals kept", () => {
    const r: VariantChecksResult = {
      ...PANEL,
      maf: {
        mean: 0.7,
        counts: Uint32Array.from(PANEL_MAF, (count, i) =>
          i === 38 ? count - 12 : count,
        ),
      },
    };
    expect(
      variantChecks.warnings(r, project({ individualFilters: THRESHOLDS })),
    ).toEqual([
      {
        code: "variantsWithoutCalls",
        text: "12 of the 1,200 variants of panel.nei have no called genotype among the individuals kept, and are in none of the histograms. The filter by observed heterozygosity, the MAF filter and the LD pruning remove them at any threshold, and the missing data filter at any threshold below 1.",
      },
    ]);
  });

  test("script with a filter of individuals gives the individuals kept to the file opened again", () => {
    expect(
      variantChecks.script(project({ individualFilters: THRESHOLDS })),
    ).toBe(
      "# The histograms of the variants, over every variant of the file and the individuals kept\n" +
        'variants_as_read = popnei.open_vars("panel.nei")\n' +
        "variants_as_read.filter_individuals(individuals_kept)\n" +
        "variant_distribs = popnei.calc_per_var_distribs(\n" +
        "    variants_as_read,\n" +
        "    stats=[popnei.PerVarStat.MISSING_RATE, popnei.PerVarStat.MAF, popnei.PerVarStat.OBS_HET, popnei.PerVarStat.UNBIASED_EXP_HET],\n" +
        "    min_num_individuals=0,\n" +
        '    hist_kwargs={"range": (0, 1), "num_bins": 40},\n' +
        ")\n",
    );
  });
});

describe("VS3 D1 the histograms of the variants", () => {
  test("warnings of MAF counts that sum to 5 of 6 variants gives variantsWithoutCalls", () => {
    const counts = Uint32Array.from([0, 0, 2, 3]);
    const r: VariantChecksResult = {
      ...PANEL,
      binEdges: Float64Array.from([0, 0.25, 0.5, 0.75, 1]),
      maf: { mean: 0.8, counts },
      obsHet: { mean: 0.2, counts },
      unbiasedExpHet: { mean: 0.3, counts },
      passStats: { numVars: 6, filtering: {} },
    };
    expect(variantChecks.warnings(r, project())).toEqual([
      {
        code: "variantsWithoutCalls",
        text: "1 of the 6 variants of panel.nei has no called genotype, and is in none of the histograms. The filter by observed heterozygosity, the MAF filter and the LD pruning remove it at any threshold, and the missing data filter at any threshold below 1.",
      },
    ]);
  });

  test("checkNumbers of panel.nei gives the variants and the three means, and not the mean missing rate", () => {
    expect(variantChecks.checkNumbers(PANEL)).toEqual([
      1200, 0.7163445463101891, 0.35429523451520484, 0.3754712450806149,
    ]);
    expect(variantChecks.numCheckNumbers(project())).toBe(4);
  });

  test("the description of the MAF of panel.nei at 0.95", () => {
    expect(
      variantHistogramDescription("maf", binsOf(PANEL_MAF, 38), 0.95),
    ).toBe(
      "The major allele frequency of 1,200 variants, in 40 bins from 0 to 1. The threshold 0.95 keeps the 38 bins up to it, 1,175 variants, and removes the 2 bins above it, 25 variants.",
    );
  });

  test("the description of the observed heterozygosity of panel.nei at 0.5, whose bin from 0.5 is split", () => {
    expect(
      variantHistogramDescription("obsHet", binsOf(PANEL_OBS_HET, 21, 20), 0.5),
    ).toBe(
      "The observed heterozygosity of 1,200 variants, in 40 bins from 0 to 1. The threshold 0.5 keeps the 20 bins up to it, 1,090 variants, splits the bin from 0.5 to 0.525, 62 variants, and removes the 19 bins above it, 48 variants.",
    );
  });
});

describe("VS6 D2 the line under a histogram of the bin its threshold splits", () => {
  test("the observed heterozygosity of panel.nei at 0.5 splits the bin from 0.5, 62 variants", () => {
    expect(splitBinText("variant", binsOf(PANEL_OBS_HET, 21, 20), 0.5)).toBe(
      "The threshold 0.5 splits the bin from 0.5 to 0.525, 62 variants: the filter keeps those of its variants at most 0.5 and removes the others.",
    );
  });

  test("the MAF of panel.nei at 0, which splits the bin from 0 to 0.025 of no variant, gives no line", () => {
    expect(PANEL_MAF[0]).toBe(0);
    expect(splitBinText("variant", binsOf(PANEL_MAF, 1, 0), 0)).toBeNull();
  });

  test("the MAF of panel.nei at 0.95 splits no bin, and no threshold gives no line", () => {
    expect(splitBinText("variant", binsOf(PANEL_MAF, 38), 0.95)).toBeNull();
    const unmarked = binsOf(PANEL_MAF, 40).map((bin) => ({
      ...bin,
      state: null,
    }));
    expect(splitBinText("variant", unmarked, null)).toBeNull();
  });
});

describe("VS3 D1 the histograms of the variants: the rest of the module", () => {
  test("warnings of panel.nei, whose MAF counts sum to its 1,200 variants, is none", () => {
    expect(variantChecks.warnings(PANEL, project())).toEqual([]);
  });

  test("warnings of 12 of 1,200 variants with no call says them in the plural", () => {
    // 9 fewer in bin 38 and 3 fewer in bin 39.
    const counts = PANEL_MAF.map((count, i) =>
      i === 38 ? count - 9 : i === 39 ? count - 3 : count,
    );
    const r: VariantChecksResult = {
      ...PANEL,
      maf: { mean: 0.7, counts: Uint32Array.from(counts) },
    };
    expect(variantChecks.warnings(r, project())).toEqual([
      {
        code: "variantsWithoutCalls",
        text: "12 of the 1,200 variants of panel.nei have no called genotype, and are in none of the histograms. The filter by observed heterozygosity, the MAF filter and the LD pruning remove them at any threshold, and the missing data filter at any threshold below 1.",
      },
    ]);
  });

  test("checkNumbers gives null for a mean popnei gave as NaN", () => {
    const r: VariantChecksResult = {
      ...PANEL,
      obsHet: { mean: NaN, counts: Uint32Array.from(PANEL_OBS_HET) },
    };
    expect(variantChecks.checkNumbers(r)).toEqual([
      1200,
      0.7163445463101891,
      null,
      0.3754712450806149,
    ]);
  });

  test("the description of the expected heterozygosity, with no threshold", () => {
    const rows = binsOf(PANEL_MAF, 40).map((bin) => ({ ...bin, state: null }));
    expect(variantHistogramDescription("unbiasedExpHet", rows, null)).toBe(
      "The unbiased expected heterozygosity of 1,200 variants, in 40 bins from 0 to 1.",
    );
  });

  test("the description of the proportion of missing genotypes, with no threshold", () => {
    const rows = binsOf(PANEL_MAF, 40).map((bin) => ({ ...bin, state: null }));
    expect(variantHistogramDescription("missingRate", rows, null)).toBe(
      "The proportion of missing genotypes of 1,200 variants, in 40 bins from 0 to 1.",
    );
  });

  test("the definition reads the filters of individuals alone, and has no key input, no reason and no option", () => {
    expect(variantChecks.id).toBe("variantChecks");
    expect(variantChecks.app).toEqual(["popgen", "gwas"]);
    expect(variantChecks.keyVersion).toBe(4);
    expect(variantChecks.filtersRead).toEqual({
      variants: false,
      individuals: true,
    });
    expect(variantChecks.defaults).toEqual({});
    expect(variantChecks.keyInputs(project())).toBeNull();
    expect(variantChecks.needs(project())).toBeNull();
    expect(variantChecks.parseOptions({}, 1)).toEqual({ ok: true, value: {} });
    expect(variantChecks.parseOptions({ numBins: 40 }, 1)).toEqual({
      ok: false,
      error: "no option",
    });
  });

  test("script of a .nei file opens it with open_vars, and with no filter of individuals gives it no list", () => {
    expect(variantChecks.script(project())).toBe(
      "# The histograms of the variants, over every variant of the file and the individuals kept\n" +
        'variants_as_read = popnei.open_vars("panel.nei")\n' +
        "variant_distribs = popnei.calc_per_var_distribs(\n" +
        "    variants_as_read,\n" +
        "    stats=[popnei.PerVarStat.MISSING_RATE, popnei.PerVarStat.MAF, popnei.PerVarStat.OBS_HET, popnei.PerVarStat.UNBIASED_EXP_HET],\n" +
        "    min_num_individuals=0,\n" +
        '    hist_kwargs={"range": (0, 1), "num_bins": 40},\n' +
        ")\n",
    );
  });

  test("script of a VCF opens it with open_vcf and its read options", () => {
    const lines = variantChecks
      .script(project({ name: "panel.vcf.gz", onlyPassed: true, ploidy: 4 }))
      .split("\n");
    expect(lines[1]).toBe(
      'variants_as_read = popnei.open_vcf("panel.vcf.gz", ploidy=4, only_passed=True)',
    );
    const every = variantChecks
      .script(project({ name: "panel.vcf.gz", onlyPassed: false }))
      .split("\n");
    expect(every[1]).toBe(
      'variants_as_read = popnei.open_vcf("panel.vcf.gz", ploidy=2, only_passed=False)',
    );
  });
});

describe("VS3 D1 the histograms of the variants: refusalText", () => {
  test("a file with no variant says so", () => {
    expect(
      refusalText(
        "the pass gave no variant and its source holds none",
        project({ name: "empty.vcf", onlyPassed: false }),
      ),
    ).toBe(
      "empty.vcf has no variants, so there is no variant to calculate the histograms of the variants over. Load another variants file in the Variants step.",
    );
  });

  test("a VCF read with only the passed variants, none of which passed, tells to untick the box", () => {
    expect(
      refusalText(
        "the pass gave no variant and its source holds none",
        project({ name: "failed.vcf", onlyPassed: true }),
      ),
    ).toBe(
      'failed.vcf has no variant with PASS or . in its FILTER column, and it was read with only those, so there is no variant to calculate the histograms of the variants over. Untick "Only the variants with PASS or . in the FILTER column" in the Variants step and read the file again.',
    );
  });

  test("a genotype of another ploidy tells to set the ploidy", () => {
    expect(
      refusalText(
        "line 5 of the VCF, the column of t00: its genotype is of the ploidy 4 and the variants are read with the ploidy 2",
        project({ name: "tetraploid.vcf.gz", onlyPassed: true }),
      ),
    ).toBe(
      "At line 5 of tetraploid.vcf.gz, the genotype of t00 has 4 alleles, and the file was read with ploidy 2. If every genotype of the file has 4 alleles, set the ploidy of the VCF to 4 in the Variants step and read the file again. A file that mixes ploidies, such as one with the X of males haploid among diploid autosomes, cannot be read in this version.",
    );
  });

  test("a gzipped file cut short tells to correct the file", () => {
    expect(
      refusalText(
        "the VCF was written by bgzip and is cut short.",
        project({ name: "panel.vcf.gz", onlyPassed: true }),
      ),
    ).toBe(
      "popnei could not read panel.vcf.gz: the VCF was written by bgzip and is cut short. Correct the file, or fetch it again, and load it in the Variants step.",
    );
  });

  test("an empty pass, which a pass with no filter cannot give, has the words of any other refusal", () => {
    expect(
      refusalText("the pass gave no variant: its source gave 3", project()),
    ).toBe(
      "popnei could not calculate the histograms of the variants: the pass gave no variant: its source gave 3. Load the variants file again, or read it again with other options, to calculate them again.",
    );
  });

  test("any other refusal gives popnei's message without its backquotes, as the diversity's table does", () => {
    expect(
      refusalText("`numBins` is 0, and a histogram needs one bin", project()),
    ).toBe(
      "popnei could not calculate the histograms of the variants: numBins is 0, and a histogram needs one bin. Load the variants file again, or read it again with other options, to calculate them again.",
    );
  });
});

describe("VS6 D2 the CSV of the bins of a histogram and its name", () => {
  test("the bins of the MAF of panel.nei with no threshold: the header, 40 rows, the 39th with the edges as popnei gave them", () => {
    const bins = binsOf(PANEL_MAF, 40).map((bin) => ({ ...bin, state: null }));
    const lines = binsCsv(bins).split("\n");
    expect(lines[0]).toBe("from,to,count,state");
    // 40 rows, and the empty text after the last new line.
    expect(lines).toHaveLength(42);
    expect(lines.at(-1)).toBe("");
    expect(lines[1]).toBe("0,0.025,0,");
    expect(lines[39]).toBe("0.95,0.975,22,");
    expect(lines[40]).toBe("0.975,1,3,");
  });

  test("the states of the bins at a threshold are kept, partly_kept and removed", () => {
    const lines = binsCsv(binsOf(PANEL_OBS_HET, 21, 20)).split("\n");
    expect(lines[20]).toBe("0.475,0.5,58,kept");
    expect(lines[21]).toBe("0.5,0.525,62,partly_kept");
    expect(lines[22]).toBe("0.525,0.55,27,removed");
  });

  test("the names of the four files, from the stem of the variants file", () => {
    expect(binsCsvName("panel.nei", "missingRate")).toBe(
      "panel.variant_missing_genotypes_bins.csv",
    );
    expect(binsCsvName("panel.nei", "maf")).toBe("panel.variant_maf_bins.csv");
    expect(binsCsvName("panel.vcf.gz", "obsHet")).toBe(
      "panel.variant_obs_het_bins.csv",
    );
    expect(binsCsvName("panel.nei", "unbiasedExpHet")).toBe(
      "panel.variant_exp_het_bins.csv",
    );
  });
});

describe("IP2 D3 the words of the statistics of each individual that a Calculate or a Count waited for, refused or failed", () => {
  test("popnei's refusal of the statistics is told in their words, and not in the words of this part", () => {
    expect(
      statisticsFailedText(
        { kind: "refused", message: "memory could not grow" },
        project(),
        () => {
          throw new Error("a refusal was given the words of a failure");
        },
      ),
    ).toBe(
      "The statistics of each individual, which the thresholds of the individuals need, could not be calculated, so the histograms of the variants were not calculated. popnei could not calculate the statistics of each individual: memory could not grow. Change the settings, or load the variants file again, to calculate them again.",
    );
  });

  test("another failure of the statistics is told in the words the frame gives it", () => {
    const failure = { kind: "workerFailed", message: "a trap" } as const;
    expect(
      statisticsFailedText(
        { kind: "failed", error: failure },
        project(),
        (f) =>
          f === failure ? "The calculation stopped unexpectedly." : "wrong",
      ),
    ).toBe(
      "The statistics of each individual, which the thresholds of the individuals need, could not be calculated, so the histograms of the variants were not calculated. The calculation stopped unexpectedly.",
    );
  });
});

/** The four statistics, in the order of the result. */
const STATISTICS: readonly VariantStatistic[] = [
  "missingRate",
  "maf",
  "obsHet",
  "unbiasedExpHet",
];

/**
 * The result of `name`, panel.nei or tetraploid.nei, in the 1,280 bins
 * over 0 to 1 that popnei 0.2.2 gave under node, which
 * e2e/fixtures/make_fixtures.mjs writes to variant_fine_bins.json; the
 * edges are popnei's, the decimals i / 1,280.
 */
function fineResult(name: "panel.nei" | "tetraploid.nei"): VariantChecksResult {
  const parsed: unknown = JSON.parse(
    readFileSync(
      new URL("../../../e2e/fixtures/variant_fine_bins.json", import.meta.url),
      "utf8",
    ),
  );
  if (field(parsed, "numBins") !== VARIANT_FINE_BINS) {
    throw new Error("variant_fine_bins.json is not of 1,280 bins");
  }
  const file = field(parsed, name);
  const distrib = (statistic: VariantStatistic) => {
    const of = field(file, statistic);
    const mean = field(of, "mean");
    const counts = field(of, "counts");
    if (typeof mean !== "number" || !Array.isArray(counts)) {
      throw new Error(`variant_fine_bins.json has no ${statistic} of ${name}`);
    }
    return {
      mean,
      counts: Uint32Array.from(counts, (count: unknown) =>
        typeof count === "number" ? count : NaN,
      ),
    };
  };
  return {
    analysis: "variantChecks",
    binEdges: Float64Array.from(
      { length: VARIANT_FINE_BINS + 1 },
      (_, i) => i / VARIANT_FINE_BINS,
    ),
    missingRate: distrib("missingRate"),
    maf: distrib("maf"),
    obsHet: distrib("obsHet"),
    unbiasedExpHet: distrib("unbiasedExpHet"),
    passStats: { numVars: name === "panel.nei" ? 1200 : 200, filtering: {} },
  };
}

/** The field `key` of `value`, or undefined when it has none. */
function field(value: unknown, key: string): unknown {
  if (typeof value !== "object" || value === null || !(key in value)) {
    return undefined;
  }
  return Object.getOwnPropertyDescriptor(value, key)?.value;
}

/** The sum of `counts`. */
function sumOf(counts: Uint32Array): number {
  return counts.reduce((sum, count) => sum + count, 0);
}

describe("the bins of popgen.html, popnei's 1,280 summed 32 at a time", () => {
  test("popnei is asked for 1,280 bins over 0 to 1, 32 in each of the 40 that popgen.html draws", () => {
    expect(VARIANT_BINS).toBe(40);
    expect(VARIANT_FINE_BINS).toBe(1280);
  });

  test("panel.nei: the 40 bins and their edges are those popnei 0.2.2 gives when asked for 40", () => {
    const result = fineResult("panel.nei");
    const missing = variantBins(result, "missingRate");
    expect(Array.from(missing.edges)).toEqual(Array.from(EDGES));
    // The decimal 3 / 40, which popnei 0.2.1 gave as 0.07500000000000001.
    expect(missing.edges[3]).toBe(0.075);
    expect(Array.from(missing.counts)).toEqual([
      345,
      768,
      86,
      1,
      ...Array.from({ length: 36 }, () => 0),
    ]);
    expect(Array.from(variantBins(result, "maf").counts)).toEqual(PANEL_MAF);
    expect(Array.from(variantBins(result, "obsHet").counts)).toEqual(
      PANEL_OBS_HET,
    );
    expect(Array.from(variantBins(result, "unbiasedExpHet").counts)).toEqual([
      0,
      3,
      10,
      13,
      12,
      26,
      30,
      30,
      39,
      46,
      44,
      58,
      45,
      80,
      58,
      70,
      88,
      109,
      130,
      240,
      69,
      ...Array.from({ length: 19 }, () => 0),
    ]);
  });

  test("tetraploid.nei: the 40 bins are those popnei 0.2.2 gives when asked for 40", () => {
    const result = fineResult("tetraploid.nei");
    const zeros = (length: number): number[] => Array.from({ length }, () => 0);
    expect(Array.from(variantBins(result, "missingRate").counts)).toEqual([
      115,
      0,
      0,
      60,
      0,
      0,
      20,
      0,
      0,
      0,
      5,
      ...zeros(29),
    ]);
    expect(Array.from(variantBins(result, "maf").counts)).toEqual([
      ...zeros(13),
      7,
      30,
      71,
      40,
      21,
      16,
      8,
      3,
      3,
      1,
      ...zeros(17),
    ]);
    expect(Array.from(variantBins(result, "obsHet").counts)).toEqual([
      ...zeros(29),
      1,
      1,
      1,
      1,
      9,
      0,
      3,
      55,
      0,
      0,
      129,
    ]);
    expect(Array.from(variantBins(result, "unbiasedExpHet").counts)).toEqual([
      ...zeros(36),
      2,
      17,
      181,
      0,
    ]);
  });

  test("bins of popnei that are not 40 times a whole number are a defect", () => {
    const result: VariantChecksResult = {
      ...PANEL,
      binEdges: Float64Array.from([0, 0.5, 1]),
      maf: { mean: 0.7, counts: Uint32Array.from([0, 3]) },
    };
    expect(() => variantBins(result, "maf")).toThrow(
      "popnei_web defect: 2 bins of the variants, not 40 times a whole number.",
    );
  });
});

describe("the bins of popgen2.html, popnei's 1,280 summed over the range of the bins with a count, rounded out", () => {
  /** The first and the last edge of the bins of `statistic`, and their
      number. */
  function rangeOf(
    result: VariantChecksResult,
    statistic: VariantStatistic,
  ): readonly [number, number, number] {
    const bins = variantBinsRounded(result, statistic);
    return [
      bins.edges[0] ?? NaN,
      bins.edges[bins.edges.length - 1] ?? NaN,
      bins.counts.length,
    ];
  }

  test("panel.nei: the missing rate from 0 to 0.1 in 32 bins, the MAF from 0.5 to 1 in 40, the observed heterozygosity from 0 to 0.7 in 32, the expected from 0 to 0.55 in 44", () => {
    const result = fineResult("panel.nei");
    expect(rangeOf(result, "missingRate")).toEqual([0, 0.1, 32]);
    expect(rangeOf(result, "maf")).toEqual([0.5, 1, 40]);
    expect(rangeOf(result, "obsHet")).toEqual([0, 0.7, 32]);
    expect(rangeOf(result, "unbiasedExpHet")).toEqual([0, 0.55, 44]);
  });

  test("tetraploid.nei: the missing rate from 0 to 0.3, the MAF from 0.3 to 0.6, the observed heterozygosity from 0.7 to 1, the expected from 0.9 to 1, each in 32 bins", () => {
    const result = fineResult("tetraploid.nei");
    expect(rangeOf(result, "missingRate")).toEqual([0, 0.3, 32]);
    expect(rangeOf(result, "maf")).toEqual([0.3, 0.6, 32]);
    expect(rangeOf(result, "obsHet")).toEqual([0.7, 1, 32]);
    expect(rangeOf(result, "unbiasedExpHet")).toEqual([0.9, 1, 32]);
  });

  test("each bin is popnei's bins added up, with popnei's inner edges, and every variant in a bin of popnei is in one", () => {
    const result = fineResult("panel.nei");
    for (const statistic of STATISTICS) {
      const fine = result[statistic].counts;
      const bins = variantBinsRounded(result, statistic);
      expect(sumOf(bins.counts)).toBe(sumOf(fine));
      // The fine bins each bin adds up: whole ones, as many in each.
      const first = Math.round((bins.edges[0] ?? NaN) * VARIANT_FINE_BINS);
      const perBin =
        Math.round(
          ((bins.edges.at(-1) ?? NaN) - (bins.edges[0] ?? NaN)) *
            VARIANT_FINE_BINS,
        ) / bins.counts.length;
      expect(Number.isInteger(perBin)).toBe(true);
      for (const [index, count] of bins.counts.entries()) {
        const from = first + index * perBin;
        expect(count).toBe(sumOf(fine.subarray(from, from + perBin)));
        if (index > 0) {
          expect(bins.edges[index]).toBe(result.binEdges[from]);
        }
      }
    }
  });

  test("the missing rate of panel.nei: its first bins", () => {
    const bins = variantBinsRounded(fineResult("panel.nei"), "missingRate");
    // 0.003125 wide, 4 of popnei's bins each, whose counts at the indices
    // 0, 6, 12 and 19 are 2, 20, 59 and 104.
    expect(Array.from(bins.counts.subarray(0, 6))).toEqual([
      2, 20, 0, 59, 104, 0,
    ]);
  });

  test("the ends are the round numbers 0.3 and 0.6, popnei's edges, which popnei 0.2.1 gave as the doubles above", () => {
    const bins = variantBinsRounded(fineResult("tetraploid.nei"), "maf");
    expect(bins.edges[0]).toBe(0.3);
    expect(bins.edges.at(-1)).toBe(0.6);
    // popnei's edges at those places.
    expect(fineResult("tetraploid.nei").binEdges[384]).toBe(0.3);
    expect(fineResult("tetraploid.nei").binEdges[768]).toBe(0.6);
  });

  /** The result of panel.nei with the counts of `statistic` 1 in each of
      popnei's bins `indices` and 0 in the others. */
  function countsAt(
    statistic: VariantStatistic,
    indices: readonly number[],
  ): VariantChecksResult {
    const counts = new Uint32Array(VARIANT_FINE_BINS);
    for (const index of indices) counts[index] = 1;
    return { ...fineResult("panel.nei"), [statistic]: { mean: 0.5, counts } };
  }

  test("a last count in the bin of popnei that ends on 0.6 gives an axis to 0.6", () => {
    const result = countsAt("maf", [0, 767]);
    expect(result.binEdges[768]).toBe(0.6);
    expect(rangeOf(result, "maf")).toEqual([0, 0.6, 32]);
  });

  test("a last count in the bin of popnei that ends on 0.3 gives an axis to 0.3", () => {
    const result = countsAt("maf", [0, 383]);
    expect(result.binEdges[384]).toBe(0.3);
    expect(rangeOf(result, "maf")).toEqual([0, 0.3, 32]);
  });

  test("the missing rate's axis starts at 0 when no variant has a missing rate near 0", () => {
    const result = countsAt("missingRate", [200, 300]);
    expect(rangeOf(result, "missingRate")).toEqual([0, 0.25, 40]);
  });

  test("a range whose rounded end is no edge of popnei's bins is a defect", () => {
    // 30 bins of 1 / 30: the counts from 2 / 30 to 4 / 30 round out to
    // 0.05, which is 1.5 bins.
    const counts = new Uint32Array(30);
    counts[2] = 1;
    counts[3] = 1;
    const result: VariantChecksResult = {
      ...PANEL,
      binEdges: Float64Array.from({ length: 31 }, (_, i) => i / 30),
      maf: { mean: 0.1, counts },
    };
    expect(() => variantBinsRounded(result, "maf")).toThrow(
      "popnei_web defect: 0.05 is no edge of 30 bins over 0 to 1.",
    );
  });

  test("a variant in a bin of popnei outside those added up is a defect", () => {
    // The MAF of panel.nei has its 1,200 variants in the bins 20 to 39.
    expect(() => summed(PANEL, "maf", 0, 20, 5)).toThrow(
      "popnei_web defect: 1200 variants in bins of popnei outside 0 to 20.",
    );
  });

  test("with no variant in a bin, the bins span 0 to 1 in 40, all empty", () => {
    const empty: VariantChecksResult = {
      ...fineResult("panel.nei"),
      maf: { mean: NaN, counts: new Uint32Array(VARIANT_FINE_BINS) },
    };
    expect(rangeOf(empty, "maf")).toEqual([0, 1, 40]);
  });
});
