/**
 * The tests of the histograms of the variants, from
 * docs/specs/analyses/variantChecks.md, "How it is verified": the request,
 * the warning of the variants with no call, the check numbers and the two
 * descriptions of docs/specs/charts/histogram.md, "The numbers without the
 * picture", on the numbers popnei gave for panel.nei in node on 26
 * September 2026 with js-v0.1.0-dev.2. The tests of the key are
 * elsewhere.
 */

import { describe, expect, test } from "vitest";
import {
  binsCsvName,
  refusalText,
  statisticsFailedText,
  variantChecks,
  variantHistogramDescription,
} from "./variantChecks.ts";
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

/** The 41 edges of popnei's 40 bins over 0 to 1, i × (1 / 40). */
const EDGES = Float64Array.from({ length: 41 }, (_, i) => i * (1 / 40));

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
  83,
  70,
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
    which no test reads, are those of the MAF. */
const PANEL: VariantChecksResult = {
  analysis: "variantChecks",
  binEdges: EDGES,
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
      numBins: 40,
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
        "    stats=[popnei.PerVarStat.MAF, popnei.PerVarStat.OBS_HET, popnei.PerVarStat.UNBIASED_EXP_HET],\n" +
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

  test("checkNumbers of panel.nei gives the variants and the three means", () => {
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

  test("the definition reads the filters of individuals alone, and has no key input, no reason and no option", () => {
    expect(variantChecks.id).toBe("variantChecks");
    expect(variantChecks.app).toEqual(["popgen", "gwas"]);
    expect(variantChecks.keyVersion).toBe(2);
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
        "    stats=[popnei.PerVarStat.MAF, popnei.PerVarStat.OBS_HET, popnei.PerVarStat.UNBIASED_EXP_HET],\n" +
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
        "line 5 of the VCF, the column of t00: its genotype is of the ploidy 4 and the reader was asked for the ploidy 2",
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
    expect(lines[39]).toBe("0.9500000000000001,0.9750000000000001,22,");
    expect(lines[40]).toBe("0.9750000000000001,1,3,");
  });

  test("the states of the bins at a threshold are kept, partly_kept and removed", () => {
    const lines = binsCsv(binsOf(PANEL_OBS_HET, 21, 20)).split("\n");
    expect(lines[20]).toBe("0.47500000000000003,0.5,58,kept");
    expect(lines[21]).toBe("0.5,0.525,62,partly_kept");
    expect(lines[22]).toBe("0.525,0.55,27,removed");
  });

  test("the names of the three files, from the stem of the variants file", () => {
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
