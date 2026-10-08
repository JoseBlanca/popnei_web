/**
 * The tests of the statistics of each individual, from
 * docs/specs/analyses/individualChecks.md, "How it is verified": the
 * worked example of three individuals and four variants, whose numbers
 * popnei gave in node; the request; the CSV; the words of each refusal of
 * popnei; and the description of the histogram of the proportion of
 * missing genotypes of panel.nei with no filter, from the fixture that
 * e2e/fixtures/make_fixtures.mjs writes with popnei. The tests of the key
 * are elsewhere.
 */

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  individualChecks,
  individualChecksCsv,
  individualHistogramDescription,
  individualRows,
  refusalText,
} from "./individualChecks.ts";
import type { DescribedBin } from "./words.ts";
import { POPGEN_ANALYSES, countsOf, individualStatsOf } from "../apps.ts";
import { INDIVIDUAL_BINS, binValues } from "../histogram.ts";
import { emptyProject, loadVariants, setIndividualFilter } from "../project.ts";
import type { Project } from "../project.ts";
import { createStore } from "../store.ts";
import type { AnalysisStatus, Store, WorkerClient } from "../store.ts";
import { deepFreeze } from "../testSupport.ts";
import type {
  IndividualChecksJob,
  IndividualChecksResult,
  Job,
  JobResult,
  Outcome,
  Run,
  VariantFilter,
} from "../../worker/protocol.ts";

const VARIANTS_ID = "00112233445566778899aabbccddeeff";

/** A project of population genetics, frozen deeply, with a variants file
    `name` read with `individuals` and the filters `filters`; a VCF read
    with ploidy 2 and `onlyPassed` when `onlyPassed` is given. */
function project(
  options: {
    readonly name?: string;
    readonly individuals?: readonly string[];
    readonly filters?: readonly VariantFilter[];
    readonly onlyPassed?: boolean;
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
          : { ploidy: 2, onlyPassed: options.onlyPassed },
      read: {
        kind: "read",
        individuals: options.individuals ?? ["i1", "i2", "i3"],
        ploidy: 2,
        numVars: null,
        keepsPassed: false,
      },
    },
    filters: options.filters ?? [],
  });
}

/** A result of the statistics of each individual; the arrays are made
    from the lists. */
function result(fields: {
  readonly individuals: readonly string[];
  readonly missingGtRate: readonly number[];
  readonly obsHetRate: readonly number[];
  readonly numVars: number;
}): IndividualChecksResult {
  return {
    analysis: "individualChecks",
    individuals: fields.individuals,
    missingGtRate: Float64Array.from(fields.missingGtRate),
    obsHetRate: Float64Array.from(fields.obsHetRate),
    passStats: { numVars: fields.numVars, filtering: {} },
  };
}

/** What popnei gave for the VCF of the worked example, in node on 26
    September 2026 with js-v0.1.0-dev.2. */
const EXAMPLE = result({
  individuals: ["i1", "i2", "i3"],
  missingGtRate: [0, 0.5, 1],
  obsHetRate: [0.5, 0.5, NaN],
  numVars: 4,
});

/** A client that records the jobs it is given and answers none, and whose
    individuals kept throw when read: the statistics read no filter, so
    their request never carries a list. */
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
    get individuals(): never {
      throw new Error("the statistics read the individuals kept");
    },
  };
  return { client, jobs };
}

/** The proportions of missing genotypes of each individual of panel.nei
    over every variant, with no filter, from the fixture. */
function panelMissingGtRate(): Float64Array {
  const parsed: unknown = JSON.parse(
    readFileSync(
      new URL(
        "../../../e2e/fixtures/panel_individual_stats.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("filters" in parsed) ||
    !Array.isArray(parsed.filters) ||
    parsed.filters.length !== 0 ||
    !("missingGtRate" in parsed) ||
    !Array.isArray(parsed.missingGtRate)
  ) {
    throw new Error("panel_individual_stats.json is not of no filter");
  }
  return Float64Array.from(parsed.missingGtRate, (v: unknown) =>
    typeof v === "number" ? v : NaN,
  );
}

/** The statistics of each individual of panel.nei, from the fixture, as a
    result of the 1,200 variants of the file. */
function panelResult(): IndividualChecksResult {
  const parsed: unknown = JSON.parse(
    readFileSync(
      new URL(
        "../../../e2e/fixtures/panel_individual_stats.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("individuals" in parsed) ||
    !Array.isArray(parsed.individuals) ||
    !("obsHetRate" in parsed) ||
    !Array.isArray(parsed.obsHetRate)
  ) {
    throw new Error("panel_individual_stats.json lacks a field");
  }
  return result({
    individuals: parsed.individuals.map((v: unknown) => String(v)),
    missingGtRate: Array.from(panelMissingGtRate()),
    obsHetRate: parsed.obsHetRate.map((v: unknown) =>
      typeof v === "number" ? v : NaN,
    ),
    numVars: 1200,
  });
}

/** The bins of `edges` and `counts` as `histogramRows` gives them for a
    threshold that keeps the bins before `split`, splits it and removes
    those after it. */
function binsAround(
  edges: Float64Array,
  counts: Uint32Array,
  split: number,
): DescribedBin[] {
  return Array.from(counts, (count, i) => ({
    from: edges[i] ?? NaN,
    to: edges[i + 1] ?? NaN,
    count,
    state: i < split ? "kept" : i === split ? "partlyKept" : "removed",
  }));
}

/** popnei's message for the empty pass of the missing data filter at 0.05
    and the MAF filter at 0.4 on panel.nei, in node on 26 September 2026. */
const PANEL_EMPTY_PASS =
  "the pass gave no variant: its source gave 1200 and the steps kept none of them, the `missing_data` filter was given 1200 and kept 1152, the `maf` filter was given 1152 and kept 0; a statistic of a pass is calculated over the variants it gives";

describe("IP2 D2 the statistics of each individual over every variant of the file", () => {
  test("run sends the job with no filter, whatever the filters of the variants and of individuals, and does not read the individuals kept", () => {
    const filters: readonly VariantFilter[] = [
      { kind: "missing_data", maxAllowedMissingRate: 0.05 },
      { kind: "obs_het", maxAllowedObsHet: 0.9 },
      { kind: "maf", maxAllowedMaf: 0.95 },
    ];
    const withThresholds = deepFreeze<Project>({
      ...project({ filters }),
      individualFilters: [
        { kind: "missing_data", maxAllowedMissingRate: 0.03 },
        { kind: "obs_het", maxAllowedObsHet: 0.38 },
      ],
    });
    const { client, jobs } = recordingClient();
    individualChecks.run(withThresholds, client);
    const expected: IndividualChecksJob = {
      analysis: "individualChecks",
      fileId: VARIANTS_ID,
      filters: [],
    };
    expect(jobs).toEqual([expected]);
  });

  test("warnings name the variants of the file, and not those the filters kept", () => {
    const r = result({
      individuals: ["s000", "s001", "s002", "s003"],
      missingGtRate: [0.02, 1, 1, 1],
      obsHetRate: [0.3, NaN, NaN, NaN],
      numVars: 1200,
    });
    const text = individualChecks.warnings(
      r,
      project({
        filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.05 }],
      }),
    )[0]?.text;
    expect(text).toMatch(/among the 1,200 variants of the file,/);
    expect(text).not.toMatch(/filters kept/);
  });

  test("an empty pass has the words of any other refusal, and does not send the user to the filters", () => {
    expect(refusalText(PANEL_EMPTY_PASS, project())).not.toMatch(
      /Loosen the filters/,
    );
  });
});

describe("VS3 D1 the statistics of each individual: the worked example", () => {
  test("individualRows gives i3 with no observed heterozygosity", () => {
    expect(individualRows(EXAMPLE)).toEqual([
      { individual: "i1", missingGenotypes: 0, observedHeterozygosity: 0.5 },
      { individual: "i2", missingGenotypes: 0.5, observedHeterozygosity: 0.5 },
      { individual: "i3", missingGenotypes: 1, observedHeterozygosity: null },
    ]);
    expect(individualRows(EXAMPLE)).toBe(individualRows(EXAMPLE));
  });

  test("warnings gives individualsWithoutCalls naming i3", () => {
    expect(individualChecks.warnings(EXAMPLE, project())).toEqual([
      {
        code: "individualsWithoutCalls",
        text: "i3 has no called genotype among the 4 variants of panel.nei, so it has no observed heterozygosity. The filter of the individuals by observed heterozygosity removes it when it is on.",
      },
    ]);
  });

  test("checkNumbers gives the variants kept and the two means", () => {
    expect(individualChecks.checkNumbers(EXAMPLE)).toEqual([4, 0.5, 0.5]);
    expect(individualChecks.numCheckNumbers(project())).toBe(3);
  });

  test("checkNumbers of the statistics of panel.nei gives the check numbers of the spec", () => {
    // Exact: a project file compares its check numbers exactly, so a
    // mean summed in another order would differ from a saved one.
    expect(individualChecks.checkNumbers(panelResult())).toEqual([
      1200, 0.0297, 0.3542891741075382,
    ]);
  });

  test("individualChecksCsv gives the header and three rows, i3's heterozygosity empty", () => {
    expect(individualChecksCsv(EXAMPLE)).toBe(
      "individual,missing_genotypes,observed_heterozygosity\n" +
        "i1,0,0.5\n" +
        "i2,0.5,0.5\n" +
        "i3,1,\n",
    );
  });
});

describe("VS3 D1 the statistics of each individual: the rest of the module", () => {
  test("warnings of three individuals with no call names them, with the file", () => {
    const r = result({
      individuals: ["s000", "s001", "s002", "s003"],
      missingGtRate: [0.02, 1, 1, 1],
      obsHetRate: [0.3, NaN, NaN, NaN],
      numVars: 1200,
    });
    expect(individualChecks.warnings(r, project())).toEqual([
      {
        code: "individualsWithoutCalls",
        text: "3 individuals of panel.nei have no called genotype among the 1,200 variants of the file, so they have no observed heterozygosity: s001, s002 and s003. The filter of the individuals by observed heterozygosity removes them when it is on.",
      },
    ]);
  });

  test("warnings over a file of one variant says the one variant of the file", () => {
    const r = result({
      individuals: ["i1", "i2"],
      missingGtRate: [0, 1],
      obsHetRate: [1, NaN],
      numVars: 1,
    });
    expect(individualChecks.warnings(r, project()).map((w) => w.text)).toEqual([
      "i2 has no called genotype among the one variant of panel.nei, so it has no observed heterozygosity. The filter of the individuals by observed heterozygosity removes it when it is on.",
    ]);
  });

  test("warnings of a result where every individual has a heterozygosity is none", () => {
    const r = result({
      individuals: ["i1", "i2"],
      missingGtRate: [0, 0.5],
      obsHetRate: [0.5, 0.5],
      numVars: 4,
    });
    expect(individualChecks.warnings(r, project())).toEqual([]);
  });

  test("checkNumbers of a result where no individual has a heterozygosity gives null", () => {
    const r = result({
      individuals: ["i1"],
      missingGtRate: [1],
      obsHetRate: [NaN],
      numVars: 4,
    });
    expect(individualChecks.checkNumbers(r)).toEqual([4, 1, null]);
  });

  test("the definition reads no filter, and has no key input, no reason and no option", () => {
    expect(individualChecks.id).toBe("individualChecks");
    expect(individualChecks.app).toEqual(["popgen", "gwas"]);
    expect(individualChecks.keyVersion).toBe(2);
    expect(individualChecks.filtersRead).toEqual({
      variants: false,
      individuals: false,
    });
    expect(individualChecks.defaults).toEqual({});
    expect(individualChecks.keyInputs(project())).toBeNull();
    expect(individualChecks.needs(project())).toBeNull();
    expect(individualChecks.parseOptions({}, 1)).toEqual({
      ok: true,
      value: {},
    });
    expect(individualChecks.parseOptions({ bins: 20 }, 1)).toEqual({
      ok: false,
      error: "no option",
    });
    expect(individualChecks.parseOptions([], 1)).toEqual({
      ok: false,
      error: "no option",
    });
  });

  test("script gives the lines of the spec", () => {
    expect(individualChecks.script(project())).toBe(
      "# The statistics of each individual, over every variant of the file\n" +
        "print(pandas.DataFrame({\n" +
        '    "missing_genotypes": individual_stats.missing_gt_rate,\n' +
        '    "observed_heterozygosity": individual_stats.obs_het_rate,\n' +
        "}).to_string())\n",
    );
  });

  test("individualChecksCsv quotes a name with a comma and a quote", () => {
    const r = result({
      individuals: ['a,"b"'],
      missingGtRate: [0.25],
      obsHetRate: [0.125],
      numVars: 4,
    });
    expect(individualChecksCsv(r)).toBe(
      "individual,missing_genotypes,observed_heterozygosity\n" +
        '"a,""b""",0.25,0.125\n',
    );
  });

  test("PA10 individualChecksCsv writes an individual named @home with a quote before it, and its numbers as numbers", () => {
    const r = result({
      individuals: ["@home"],
      missingGtRate: [0.25],
      obsHetRate: [0.125],
      numVars: 4,
    });
    expect(individualChecksCsv(r)).toBe(
      "individual,missing_genotypes,observed_heterozygosity\n" +
        "'@home,0.25,0.125\n",
    );
  });

  test("individualChecksCsv quotes a name with a carriage return, which ends a line of a CSV", () => {
    const r = result({
      individuals: ["a\rb"],
      missingGtRate: [0.25],
      obsHetRate: [0.125],
      numVars: 4,
    });
    expect(individualChecksCsv(r)).toBe(
      "individual,missing_genotypes,observed_heterozygosity\n" +
        '"a\rb",0.25,0.125\n',
    );
  });

  test("warnings of several individuals with no call name the file escaped", () => {
    const r = result({
      individuals: ["s000", "s001", "s002"],
      missingGtRate: [0.02, 1, 1],
      obsHetRate: [0.3, NaN, NaN],
      numVars: 1152,
    });
    expect(
      individualChecks.warnings(r, project({ name: "a\tb.nei" })).at(0)?.text,
    ).toBe(
      "2 individuals of a\\tb.nei have no called genotype among the 1,152 variants of the file, so they have no observed heterozygosity: s001 and s002. The filter of the individuals by observed heterozygosity removes them when it is on.",
    );
  });
});

describe("VS3 D1 the statistics of each individual: refusalText", () => {
  test("an empty pass, which a pass with no filter cannot give, has the words of any other refusal", () => {
    expect(refusalText(PANEL_EMPTY_PASS, project())).toBe(
      "popnei could not calculate the statistics of each individual: the pass gave no variant: its source gave 1200 and the steps kept none of them, the missing_data filter was given 1200 and kept 1152, the maf filter was given 1152 and kept 0; a statistic of a pass is calculated over the variants it gives. Change the settings, or load the variants file again, to calculate them again.",
    );
  });

  test("a genotype of another ploidy tells to set the ploidy", () => {
    const message =
      "line 5 of the VCF, the column of t00: its genotype is of the ploidy 4 and the variants are read with the ploidy 2";
    expect(
      refusalText(
        message,
        project({ name: "tetraploid.vcf.gz", onlyPassed: true }),
      ),
    ).toBe(
      "At line 5 of tetraploid.vcf.gz, the genotype of t00 has 4 alleles, and the file was read with ploidy 2. If every genotype of the file has 4 alleles, set the ploidy of the VCF to 4 in the Variants step and read the file again. A file that mixes ploidies, such as one with the X of males haploid among diploid autosomes, cannot be read in this version.",
    );
  });

  test("a file with no variant says so", () => {
    expect(
      refusalText(
        "the pass gave no variant and its source holds none",
        project({ name: "empty.vcf", onlyPassed: false }),
      ),
    ).toBe(
      "empty.vcf has no variants, so there is no variant to calculate the statistics of each individual over. Load another variants file in the Variants step.",
    );
  });

  test("a VCF read with only the passed variants, none of which passed, tells to untick the box", () => {
    expect(
      refusalText(
        "the pass gave no variant and its source holds none",
        project({ name: "failed.vcf", onlyPassed: true }),
      ),
    ).toBe(
      'failed.vcf has no variant with PASS or . in its FILTER column, and it was read with only those, so there is no variant to calculate the statistics of each individual over. Untick "Only the variants with PASS or . in the FILTER column" in the Variants step and read the file again.',
    );
  });

  test("a line of the VCF popnei cannot read tells to correct the file", () => {
    expect(
      refusalText(
        "line 12 of the VCF: the column POS is not a number.",
        project({ name: "panel.vcf.gz", onlyPassed: true }),
      ),
    ).toBe(
      "popnei could not read panel.vcf.gz: line 12 of the VCF: the column POS is not a number. Correct the file, or fetch it again, and load it in the Variants step.",
    );
  });

  test("a project with no variants file is a defect", () => {
    expect(() => refusalText("out of memory", emptyProject("popgen"))).toThrow(
      "popnei_web defect: a refusal was given a project with no variants file.",
    );
  });

  test("another message gives popnei's message without its full stop, and to calculate them again", () => {
    expect(refusalText("out of memory.", project())).toBe(
      "popnei could not calculate the statistics of each individual: out of memory. Change the settings, or load the variants file again, to calculate them again.",
    );
  });
});

describe("VS3 D1 the statistics of each individual: the descriptions", () => {
  test("the proportion of missing genotypes of panel.nei, with the threshold 0.03", () => {
    const bins = binValues(panelMissingGtRate(), INDIVIDUAL_BINS);
    if (bins === null) {
      throw new Error("panel.nei gave no bins");
    }
    // The bin the threshold 0.03 splits.
    expect(bins.edges[9]).toBe(0.029500000000000002);
    expect(bins.edges[10]).toBe(0.030833333333333334);
    expect(
      individualHistogramDescription(
        "missingGenotypes",
        binsAround(bins.edges, bins.counts, 9),
        0.03,
      ),
    ).toBe(
      "The proportion of missing genotypes of 200 individuals, in 20 bins from 0.0175 to 0.0442. The threshold 0.03 keeps the 9 bins up to it, 104 individuals, splits the bin from 0.0295 to 0.0308, 25 individuals, and removes the 10 bins above it, 71 individuals.",
    );
  });

  test("with no threshold, the first sentence alone", () => {
    const bins = binValues(panelMissingGtRate(), INDIVIDUAL_BINS);
    if (bins === null) {
      throw new Error("panel.nei gave no bins");
    }
    const rows = binsAround(bins.edges, bins.counts, 0).map((bin) => ({
      ...bin,
      state: null,
    }));
    expect(
      individualHistogramDescription("observedHeterozygosity", rows, null),
    ).toBe(
      "The observed heterozygosity of 200 individuals, in 20 bins from 0.0175 to 0.0442.",
    );
  });

  test("a threshold below the first edge keeps none of the bins", () => {
    const rows: DescribedBin[] = [
      { from: 0.3, to: 0.35, count: 1, state: "removed" },
      { from: 0.35, to: 0.4, count: 2, state: "removed" },
    ];
    expect(
      individualHistogramDescription("observedHeterozygosity", rows, 0.2),
    ).toBe(
      "The observed heterozygosity of 3 individuals, in 2 bins from 0.3 to 0.4. The threshold 0.2 keeps none of the bins, and removes the 2 bins above it, 3 individuals.",
    );
  });

  test("no bin, a state with no threshold, a threshold with no state, and two bins split are defects", () => {
    const bin: DescribedBin = { from: 0, to: 1, count: 1, state: null };
    expect(() =>
      individualHistogramDescription("missingGenotypes", [], null),
    ).toThrow("popnei_web defect: a histogram with no bin to describe.");
    expect(() =>
      individualHistogramDescription(
        "missingGenotypes",
        [{ ...bin, state: "kept" }],
        null,
      ),
    ).toThrow(
      "popnei_web defect: a bin of a histogram has a state and no threshold.",
    );
    expect(() =>
      individualHistogramDescription("missingGenotypes", [bin], 0.5),
    ).toThrow(
      "popnei_web defect: a bin of a histogram with a threshold has no state.",
    );
    expect(() =>
      individualHistogramDescription(
        "missingGenotypes",
        [
          { ...bin, state: "partlyKept" },
          { ...bin, from: 1, to: 2, state: "partlyKept" },
        ],
        0.5,
      ),
    ).toThrow(
      "popnei_web defect: a threshold splits more than one bin of a histogram.",
    );
  });

  test("one bin kept and none removed says the bin, in the singular", () => {
    const rows: DescribedBin[] = [
      { from: 0.3, to: 0.35, count: 1, state: "kept" },
    ];
    expect(
      individualHistogramDescription("observedHeterozygosity", rows, 0.5),
    ).toBe(
      "The observed heterozygosity of 1 individual, in 1 bin from 0.3 to 0.35. The threshold 0.5 keeps the bin up to it, 1 individual.",
    );
  });
});

/** A request the store of the application sent, with the number of times
    it was cancelled. */
interface Sent {
  readonly key: string;
  readonly job: Job;
  readonly run: Run<JobResult>;
  readonly cancels: () => number;
}

/** The store of the population genetics page, as the page makes it, with
    a fake send that records each request and answers none; `panel.nei`
    of the three individuals of the worked example is loaded as
    `VARIANTS_ID` and read, with the threshold of 0.6 on the proportion
    of missing genotypes, which keeps i1 and i2. */
function exampleStore(): {
  readonly store: Store<JobResult>;
  readonly sent: Sent[];
} {
  const sent: Sent[] = [];
  const store = createStore<Job, JobResult>({
    first: emptyProject("popgen"),
    analyses: POPGEN_ANALYSES,
    send: (key, job) => {
      let cancels = 0;
      const run: Run<JobResult> = {
        id: sent.length + 1,
        outcome: new Promise<Outcome<JobResult>>(() => undefined),
        cancel: () => {
          cancels += 1;
        },
      };
      sent.push({ key, job, run, cancels: () => cancels });
      return run;
    },
    countsOf,
    counts: "filterCounts",
    statistics: { analysis: "individualChecks", of: individualStatsOf },
    write: null,
    appVersion: "0.1.0",
    cacheMaxBytes: 1024 * 1024,
    maxUndoSteps: 200,
  });
  store.popneiReady("0.1.0");
  loadExample(store, VARIANTS_ID);
  store.apply("the missing data filter of the individuals changed", (p) =>
    setIndividualFilter(p, {
      kind: "missing_data",
      maxAllowedMissingRate: 0.6,
    }),
  );
  return { store, sent };
}

/** Loads panel.nei of the worked example as the load `fileId`, and reads
    it with i1, i2 and i3. */
function loadExample(store: Store<JobResult>, fileId: string): void {
  store.apply("a variants file was loaded", (p) =>
    loadVariants(p, {
      fileId,
      name: "panel.nei",
      size: 261_490,
      format: "nei",
      readOptions: null,
    }),
  );
  store.variantsRead(fileId, {
    kind: "read",
    individuals: ["i1", "i2", "i3"],
    ploidy: 2,
    numVars: null,
    keepsPassed: false,
  });
}

/** The state the store gives the statistics of each individual. */
function statisticsIn(store: Store<JobResult>): AnalysisStatus<JobResult> {
  const status = store
    .getState()
    .analyses.find((view) => view.id === "individualChecks")?.status;
  if (status === undefined) {
    throw new Error("the store has no statistics of each individual");
  }
  return status;
}

/** The one request the store sent, of the statistics. */
function statisticsSent(sent: readonly Sent[]): Sent {
  const request = sent[0];
  if (sent.length !== 1 || request?.job.analysis !== "individualChecks") {
    throw new Error("the store sent other than the statistics alone");
  }
  return request;
}

describe("IP10 D3 the cases of the statistics of each individual in the store of the application", () => {
  test("an undo to an earlier load finds the statistics in the cache, done with the same result, and the list of the individuals kept with them, with no calculation", () => {
    const { store, sent } = exampleStore();
    store.startRun("individualChecks");
    const request = statisticsSent(sent);
    store.runEnded(request.run.id, {
      kind: "done",
      key: request.key,
      result: EXAMPLE,
    });
    expect(store.getState().individualsKept?.list).toStrictEqual({
      kind: "known",
      individuals: ["i1", "i2"],
    });

    loadExample(store, "ffeeddccbbaa99887766554433221100");
    expect(statisticsIn(store).kind).toBe("removed");
    expect(store.getState().individualsKept?.list).toStrictEqual({
      kind: "needsStatistics",
    });

    store.undo();

    const status = statisticsIn(store);
    expect(status).toMatchObject({ kind: "done", key: request.key });
    expect(status.kind === "done" && status.result).toBe(EXAMPLE);
    expect(store.getState().individualsKept?.list).toStrictEqual({
      kind: "known",
      individuals: ["i1", "i2"],
    });
    expect(sent).toHaveLength(1);
  });

  test("statistics that arrive after a new load go into the cache under the key they were asked for, and an undo shows them, with the list of the individuals kept, with no calculation", () => {
    const { store, sent } = exampleStore();
    store.startRun("individualChecks");
    const request = statisticsSent(sent);
    loadExample(store, "ffeeddccbbaa99887766554433221100");
    expect(request.cancels()).toBe(1);

    store.runEnded(request.run.id, {
      kind: "done",
      key: request.key,
      result: EXAMPLE,
    });
    expect(statisticsIn(store).kind).not.toBe("done");
    expect(store.getState().individualsKept?.list).toStrictEqual({
      kind: "needsStatistics",
    });

    store.undo();

    const status = statisticsIn(store);
    expect(status).toMatchObject({ kind: "done", key: request.key });
    expect(status.kind === "done" && status.result).toBe(EXAMPLE);
    expect(store.getState().individualsKept?.list).toStrictEqual({
      kind: "known",
      individuals: ["i1", "i2"],
    });
    expect(sent).toHaveLength(1);
  });
});

describe("IP10 D3 the statistics of each individual: refusalText of a gzipped VCF", () => {
  test("a gzipped VCF cut short tells to correct the file or fetch it again", () => {
    const message =
      "the VCF was written by bgzip and does not end with the empty member of 28 bytes that marks the end of a bgzipped file, so the file is cut short and the variants after the cut are not in it; the file has to be fetched or copied again. bcftools says of the same file `no BGZF EOF marker; file may be truncated`";
    expect(
      refusalText(message, project({ name: "panel.vcf.gz", onlyPassed: true })),
    ).toBe(
      `popnei could not read panel.vcf.gz: ${message}. Correct the file, or fetch it again, and load it in the Variants step.`,
    );
  });
});
