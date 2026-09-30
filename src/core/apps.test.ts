import { describe, expect, test } from "vitest";
import {
  POPGEN_ANALYSES,
  POPGEN_ANALYSIS_STEPS,
  POPGEN_STEPS,
  countsOf,
  firstProject,
  individualStatsOf,
  variantsKept,
  writeCountsOf,
} from "./apps.ts";
import { pca } from "./analyses/pca.ts";
import { resultBytes } from "./cache.ts";
import { keyFromWire } from "./keys.ts";
import { emptyProject } from "./project.ts";
import { createStore } from "./store.ts";
import type { AnalysisView, AppState, Store } from "./store.ts";
import { FIVE_INDIVIDUALS, fiveIndividualsProject } from "./testSupport.ts";
import type {
  DiversityResult,
  IndividualChecksResult,
  Job,
  JobResult,
  LdDecayResult,
  Outcome,
  PassStats,
  PcaResult,
  Run,
  VariantChecksResult,
  VariantDistrib,
} from "../worker/protocol.ts";

/** The counts of a pass of the missing data filter over 1,200 variants,
    of the spec's example. */
const MISSING_PASS: PassStats = {
  numVars: 1152,
  filtering: { missing_data: { varsProcessed: 1200, varsKept: 1152 } },
};

/** A result of the diversity of one population, with the counts `pass`. */
function diversityResult(pass: PassStats): DiversityResult {
  return {
    analysis: "diversity",
    pops: ["p0"],
    numIndividuals: Uint32Array.from([48]),
    unbiasedExpHet: Float64Array.from([0.35]),
    obsHet: Float64Array.from([0.35]),
    polyRatio: Float64Array.from([0.9]),
    numVarsWithValue: Uint32Array.from([pass.numVars]),
    passStats: pass,
  };
}

/** A result of the statistics of each individual, of two individuals,
    with the counts `pass`. */
function individualChecksResult(pass: PassStats): IndividualChecksResult {
  return {
    analysis: "individualChecks",
    individuals: ["i1", "i2"],
    missingGtRate: Float64Array.from([0.1, 0.2]),
    obsHetRate: Float64Array.from([0.3, Number.NaN]),
    passStats: pass,
  };
}

/** A histogram of the variants with one bin. */
function distrib(): VariantDistrib {
  return { mean: 0.25, counts: Uint32Array.from([1200]) };
}

/** A state of the first project whose analyses are `views`, and nothing
    else `variantsKept` reads. */
function stateWith(
  views: readonly AnalysisView<JobResult>[],
): AppState<JobResult, unknown> {
  return {
    project: firstProject("popgen"),
    undo: null,
    redo: null,
    historyMoves: 0,
    popneiVersion: "0.1.0",
    analyses: views,
    runs: [],
    notice: null,
    individualsKept: null,
    write: null,
  };
}

const KEY = keyFromWire("0".repeat(64));

describe("IP8 D3 the analyses of apps.ts", () => {
  test("the principal components are an analysis of population genetics, in the Analyses step, just before the diversity", () => {
    const ids = POPGEN_ANALYSES.map((def) => def.id);
    expect(POPGEN_ANALYSES[ids.indexOf("pca")]).toBe(pca);
    expect(ids.indexOf("pca")).toBe(ids.indexOf("diversity") - 1);
    expect(POPGEN_ANALYSIS_STEPS["pca"]).toBe("analyses");
    expect(POPGEN_ANALYSIS_STEPS["diversity"]).toBe("analyses");
  });
});

describe("VS5 D1 apps.ts", () => {
  test("the first project of population genetics has the missing data filter at 0.1 and nothing else", () => {
    expect(firstProject("popgen")).toEqual({
      ...emptyProject("popgen"),
      filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.1 }],
    });
  });

  test("the analyses of population genetics have distinct ids: the three checks of the Variants step in the order of its sections, the statistics of each individual first since 28 September 2026, then the principal components and the diversity", () => {
    const ids = POPGEN_ANALYSES.map((def) => def.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      "individualChecks",
      "variantChecks",
      "filterCounts",
      "pca",
      "diversity",
    ]);
  });

  test("each analysis has its step in POPGEN_ANALYSIS_STEPS, the checks in the Variants step and the principal components and the diversity in the Analyses step, and no other analysis has one", () => {
    expect(POPGEN_ANALYSIS_STEPS).toStrictEqual({
      individualChecks: "variants",
      variantChecks: "variants",
      filterCounts: "variants",
      pca: "analyses",
      diversity: "analyses",
    });
    expect(Object.keys(POPGEN_ANALYSIS_STEPS).toSorted()).toEqual(
      POPGEN_ANALYSES.map((def) => def.id).toSorted(),
    );
  });

  test("the variants kept are those the Counts of the filters kept when they are done, and null otherwise", () => {
    const done: AnalysisView<JobResult> = {
      id: "filterCounts",
      status: {
        kind: "done",
        key: KEY,
        result: {
          analysis: "filterCounts",
          passStats: {
            numVars: 1128,
            filtering: {
              missing_data: { varsProcessed: 1200, varsKept: 1128 },
            },
          },
        },
        warnings: [],
        check: null,
      },
    };
    expect(variantsKept(stateWith([done]))).toBe(1128);
    expect(
      variantsKept(
        stateWith([
          { id: "filterCounts", status: { kind: "ready", key: KEY } },
        ]),
      ),
    ).toBeNull();
  });
});

describe("PA2 D5 countsOf of a result of the LD decay", () => {
  test("countsOf of a result of the LD decay with the passStats of the diversity gives the variants of the file, 1,200, and no counts, since its filters are the project's but the LD pruning", () => {
    const result: LdDecayResult = {
      analysis: "ldDecay",
      pops: ["p0"],
      numIndividuals: Uint32Array.from([48]),
      numVars: Float64Array.from([1100]),
      smallestDist: Float64Array.from([1]),
      largestDist: Float64Array.from([100]),
      numPairs: Float64Array.from([10]),
      meanR2: Float64Array.from([0.2]),
      sdR2: Float64Array.from([0.1]),
      rhoPerBp: Float64Array.from([0.01]),
      r2AtZero: Float64Array.from([0.47]),
      halfDist: Float64Array.from([50]),
      passStats: MISSING_PASS,
    };
    expect(countsOf(result)).toStrictEqual({ numVarsRead: 1200, counts: null });
  });
});

describe("WS5 D4 apps.ts", () => {
  test("the steps of population genetics are variants, individuals and analyses, in that order", () => {
    expect(POPGEN_STEPS).toEqual(["variants", "individuals", "analyses"]);
  });
});

describe("VS3 D5 countsOf, writeCountsOf and individualStatsOf", () => {
  test("countsOf of a diversity result gives the variants its missing data filter was given, 1,200, and the counts of the same passStats", () => {
    const result = diversityResult(MISSING_PASS);
    const found = countsOf(result);
    expect(found).toStrictEqual({
      numVarsRead: 1200,
      counts: { analysis: "filterCounts", passStats: MISSING_PASS },
    });
    expect(found.counts?.passStats).toBe(MISSING_PASS);
  });

  test("countsOf of a result of the histograms of the variants gives the variants of its pass and no counts", () => {
    const result: VariantChecksResult = {
      analysis: "variantChecks",
      binEdges: Float64Array.from([0, 1]),
      maf: distrib(),
      obsHet: distrib(),
      unbiasedExpHet: distrib(),
      passStats: { numVars: 1200, filtering: {} },
    };
    expect(countsOf(result)).toStrictEqual({ numVarsRead: 1200, counts: null });
  });

  test("countsOf of a result of filterCounts gives both the variants of the file and the counts", () => {
    const counts = { analysis: "filterCounts", passStats: MISSING_PASS };
    expect(
      countsOf({ analysis: "filterCounts", passStats: MISSING_PASS }),
    ).toStrictEqual({ numVarsRead: 1200, counts });
  });

  test("countsOf reads the variants of the file from the first filter in the fixed order of the filters, not from the order of the fields of filtering", () => {
    const pass: PassStats = {
      numVars: 1128,
      filtering: {
        maf: { varsProcessed: 1152, varsKept: 1128 },
        missing_data: { varsProcessed: 1200, varsKept: 1152 },
      },
    };
    expect(countsOf(diversityResult(pass)).numVarsRead).toBe(1200);
  });

  test("writeCountsOf of the counts of a pass gives the same result of filterCounts as countsOf", () => {
    const counts = countsOf(diversityResult(MISSING_PASS)).counts;
    expect(writeCountsOf(MISSING_PASS)).toStrictEqual(counts);
  });

  test("individualStatsOf of a result of individualChecks gives its three fields, and of a diversity result throws", () => {
    const result = individualChecksResult(MISSING_PASS);
    const stats = individualStatsOf(result);
    expect(stats).toStrictEqual({
      individuals: result.individuals,
      missingGtRate: result.missingGtRate,
      obsHetRate: result.obsHetRate,
    });
    expect(stats.individuals).toBe(result.individuals);
    expect(stats.missingGtRate).toBe(result.missingGtRate);
    expect(stats.obsHetRate).toBe(result.obsHetRate);
    expect(() => individualStatsOf(diversityResult(MISSING_PASS))).toThrow(
      /^popnei_web defect: the statistics of each individual were asked of a result of diversity/,
    );
  });
});

describe("IP2 D2 countsOf in the order of 28 September 2026", () => {
  test("countsOf of a result of the statistics of each individual, whose pass has no filter, gives the variants of the file and no counts", () => {
    const pass: PassStats = { numVars: 1200, filtering: {} };
    expect(countsOf(individualChecksResult(pass))).toStrictEqual({
      numVarsRead: 1200,
      counts: null,
    });
  });
});

/** A result of the PCA of two individuals with the counts `pass`. */
function pcaResult(pass: PassStats): PcaResult {
  return {
    analysis: "pca",
    method: "pca",
    individuals: ["s000", "s001"],
    numComps: 1,
    numCompsFound: 1,
    projections: Float64Array.from([1, -1]),
    explainedVariancePercent: Float64Array.from([100]),
    numVarsUsed: pass.numVars,
    lingoesConstant: null,
    negativeEigenvaluesPercent: null,
    passStats: pass,
  };
}

describe("IP6 D4 countsOf of a result of the PCA", () => {
  test("a PCA with its own LD filter, missing data 1,200 to 1,200 and LD 1,200 to 548: the variants of the file and no counts", () => {
    const pass: PassStats = {
      numVars: 548,
      filtering: {
        missing_data: { varsProcessed: 1200, varsKept: 1200 },
        ld: { varsProcessed: 1200, varsKept: 548 },
      },
    };
    expect(countsOf(pcaResult(pass))).toStrictEqual({
      numVarsRead: 1200,
      counts: null,
    });
  });

  test("a PCA that follows the filters of a new project, missing data 1,200 to 1,200 alone: the variants of the file and no counts as well", () => {
    const pass: PassStats = {
      numVars: 1200,
      filtering: { missing_data: { varsProcessed: 1200, varsKept: 1200 } },
    };
    expect(countsOf(pcaResult(pass))).toStrictEqual({
      numVarsRead: 1200,
      counts: null,
    });
  });
});

/** A request the store sent, with the id of its run. */
interface Sent {
  readonly id: number;
  readonly key: string;
  readonly job: Job;
}

/** A store of the analyses of the page, as src/ui/popgenStore.ts makes
    it, with a cache of `cacheMaxBytes` and a `send` whose requests the
    test ends by hand. */
function popgenStoreOf(cacheMaxBytes: number): {
  readonly store: Store<JobResult>;
  readonly sent: Sent[];
} {
  const sent: Sent[] = [];
  const store = createStore<Job, JobResult>({
    first: firstProject("popgen"),
    analyses: POPGEN_ANALYSES,
    send: (key, job): Run<JobResult> => {
      const id = sent.length + 1;
      sent.push({ id, key, job });
      return {
        id,
        outcome: new Promise<Outcome<JobResult>>(() => undefined),
        cancel: () => undefined,
      };
    },
    countsOf,
    counts: "filterCounts",
    statistics: { analysis: "individualChecks", of: individualStatsOf },
    write: null,
    appVersion: "0.1.0",
    cacheMaxBytes,
    maxUndoSteps: 100,
  });
  store.popneiReady("0.1.0");
  return { store, sent };
}

/** The statistics of the five individuals of the worked case. */
const FIVE_STATS: IndividualChecksResult = {
  analysis: "individualChecks",
  individuals: FIVE_INDIVIDUALS,
  missingGtRate: Float64Array.from([0.2, 0.1, 0.3, 0.05, 1]),
  obsHetRate: Float64Array.from([0.3, 0.5, 0.2, 0.4, Number.NaN]),
  passStats: { numVars: 1200, filtering: {} },
};

/** Histograms of the variants over 1,200 variants. */
const HISTOGRAMS: VariantChecksResult = {
  analysis: "variantChecks",
  binEdges: Float64Array.from([0, 1]),
  maf: distrib(),
  obsHet: distrib(),
  unbiasedExpHet: distrib(),
  passStats: { numVars: 1200, filtering: {} },
};

/** Ends the request `request` with `result`. */
function end(
  store: Store<JobResult>,
  request: Sent | undefined,
  result: JobResult,
): void {
  expect(request?.job.analysis).toBe(result.analysis);
  if (request === undefined) return;
  store.runEnded(request.id, { kind: "done", key: request.key, result });
}

describe("IP2 D3 the histograms of the variants after an undo to a load whose statistics the cache dropped", () => {
  test("the histograms still in the cache are done while the individuals kept are not known (store.md, 'The state of an analysis')", () => {
    // Room for the histograms of two loads and the statistics of one, so
    // that the statistics of the first load, used longest ago, go first.
    const bound =
      2 * resultBytes(HISTOGRAMS) + Math.floor(1.5 * resultBytes(FIVE_STATS));
    const { store, sent } = popgenStoreOf(bound);
    store.open(
      fiveIndividualsProject([
        { kind: "missing_data", maxAllowedMissingRate: 0.2 },
      ]),
    );
    // A Calculate of the histograms calculates the statistics first.
    const calculate = (): void => {
      store.startRun("variantChecks");
      end(store, sent.at(-1), FIVE_STATS);
      end(store, sent.at(-1), HISTOGRAMS);
    };
    calculate();
    store.apply("a new variants file was loaded", (p) =>
      p.variants === null
        ? p
        : {
            ...p,
            variants: {
              ...p.variants,
              fileId: "0123456789abcdef0123456789abcdef",
            },
          },
    );
    calculate();

    store.undo();

    const state = store.getState();
    const histograms = state.analyses.find((a) => a.id === "variantChecks");
    expect(histograms?.status.kind).toBe("done");
    expect(state.individualsKept?.list.kind).toBe("needsStatistics");
  });
});
