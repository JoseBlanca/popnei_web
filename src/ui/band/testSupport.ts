/**
 * The page of popgen2.html as its entry makes it, for the tests of the
 * band: the real store with a fake worker whose requests the test moves,
 * the gate, the analyses started by themselves, the log of the errors
 * and the tab shown (docs/specs/steps/popgen2-band.md, "How it is
 * checked"). Not part of the page: the lint keeps a file named
 * testSupport out of every module but the tests.
 */
import {
  diversityOnPopgen2,
  diversityOptions,
} from "../../core/analyses/diversity.ts";
import type { DiversityOptions } from "../../core/analyses/diversity.ts";
import {
  ldDecayOnPopgen2,
  ldDecayOptions,
} from "../../core/analyses/ldDecay.ts";
import type { LdDecayOptions } from "../../core/analyses/ldDecay.ts";
import { pcaOnPopgen2, pcaOptions } from "../../core/analyses/pca.ts";
import type { PcaOptions } from "../../core/analyses/pca.ts";
import type { PageTab } from "../../core/popgen2Tabs.ts";
import type { Project } from "../../core/project.ts";
import { setAnalysisOptions } from "../../core/project.ts";
import type {
  Job,
  JobResult,
  Outcome,
  PcaMethod,
  Progress,
  Run,
  WriteJob,
  Written,
} from "../../worker/protocol.ts";
import { LIVE_QUIET_MS, createAutoRuns } from "../autoRuns.ts";
import type { AutoRuns } from "../autoRuns.ts";
import { createDefects } from "../defects.ts";
import type { Defects } from "../defects.ts";
import { POPGEN2_LIVE } from "../../core/apps.ts";
import type { Popgen2LiveId } from "../../core/apps.ts";
import {
  POPGEN2_AUTO_GROUPS,
  createPopgen2Store,
  openVariantsFile,
  popgen2EndsLive,
} from "../popgen2Store.ts";
import type { Popgen2PageStore } from "../popgen2Store.ts";
import { startAnalysis } from "../runs.ts";
import { createRunGate, gatedStore } from "../variants/thresholdRun.ts";
import type { RunGate } from "../variants/thresholdRun.ts";
import { bandOf, liveStatesOf } from "./bandLine.ts";
import type { Band, BandPage } from "./bandLine.ts";

/** The id of the load of `panel.nei` the test page opens. */
export const FILE = "0123456789abcdef0123456789abcdef";

/** A request the fake worker was given, of the job `J` whose outcome
    is `R`, and how the test moves it. */
export interface FakeRequest<J, R> {
  /** Its key, as the store sent it. */
  readonly key: string;
  /** What it asks. */
  readonly job: J;
  /** Gives the store a progress of it. */
  readonly progress: (p: Progress) => void;
  /** Ends it with `outcome`. */
  readonly end: (outcome: Outcome<R>) => void;
}

/** A calculation the fake worker was given: it ends with a result of an
    analysis. */
export type Request = FakeRequest<Job, JobResult>;

/** A write of the filtered variants the fake worker was given: it ends
    with a file, never with the result of an analysis. */
export type WriteRequest = FakeRequest<WriteJob, Written<Blob>>;

/** The fake worker's side of a request: records it into `into`, and
    gives its handle, number `id`, whose outcome the test settles. */
function fakeRun<J, R>(
  into: FakeRequest<J, R>[],
  id: number,
  key: string,
  job: J,
  onProgress: (p: Progress) => void,
): Run<R> {
  let end: (outcome: Outcome<R>) => void = () => undefined;
  const outcome = new Promise<Outcome<R>>((resolve) => {
    end = resolve;
  });
  into.push({ key, job, progress: onProgress, end });
  return { id, outcome, cancel: () => undefined };
}

/** Lets the outcomes and the microtasks of the page's `sync` settle. */
export async function flush(): Promise<void> {
  for (let turn = 0; turn < 30; turn += 1) await Promise.resolve();
}

/** A result of the PCA, or of the PCoA, of `s000` and `s001`, with
    `numVarsUsed` variants. */
export function pcaResult(method: PcaMethod, numVarsUsed: number): JobResult {
  return {
    analysis: "pca",
    method,
    individuals: ["s000", "s001"],
    numComps: 1,
    numCompsFound: 1,
    projections: Float64Array.from([1, -1]),
    explainedVariancePercent: Float64Array.from([100]),
    numVarsUsed: method === "pca" ? numVarsUsed : null,
    lingoesConstant: null,
    negativeEigenvaluesPercent: null,
    passStats: { numVars: numVarsUsed, filtering: {} },
  };
}

/** The page of popgen2.html as its entry makes it: the store, the gate,
    the analyses started by themselves, the log of the errors and the tab
    shown, with a fake worker; `panel.nei` open and read, and the PCA's
    LD distance typed, 50,000. The one pass is not ended. */
export interface TestPage {
  /** The store of the page, over the fake worker. */
  readonly store: Popgen2PageStore<JobResult, Blob>;
  /** The analyses the page starts by itself, the one pass and the live
      analyses. */
  readonly auto: AutoRuns;
  /** The gate the screens pass, whose holds the test takes. */
  readonly gate: RunGate;
  /** The log of the errors of the application. */
  readonly defects: Defects;
  /** The calculations the fake worker was given, in their order. */
  readonly requests: Request[];
  /** The writes of the filtered variants it was given, in their order. */
  readonly writes: WriteRequest[];
  /** The tab shown, which the test sets; the Variants tab first. */
  tab: PageTab;
  /** The time now that the band is given, which the test sets; 0 first. */
  now: number;
  /** When the band first saw a Stop waiting, which the test sets; `null`
      first. */
  stoppingSince: number | null;
  /** The method of the PCA when the band first saw a Stop waiting,
      which the test sets; `null` first. */
  stoppedMethod: PcaMethod | null;
  /** What the band shows of the page now. */
  readonly band: () => Band;
  /** Ends the one pass with the summary the page was made with, after
      letting it start. */
  readonly endPass: () => Promise<void>;
  /** The last request of a PCA the fake worker was given. */
  readonly lastPca: () => Request;
  /** Changes the options of the PCA, through the gate, as the PCA tab
      does. */
  readonly setPca: (options: Partial<PcaOptions>) => void;
  /** The last request of the diversity the fake worker was given. */
  readonly lastDiversity: () => Request;
  /** Changes the options of the diversity, through the gate, as the
      Populations tab does. */
  readonly setDiversity: (options: Partial<DiversityOptions>) => void;
  /** The last request of the LD decay the fake worker was given. */
  readonly lastLdDecay: () => Request;
  /** Changes the options of the LD decay, through the gate, as the
      Populations tab does. */
  readonly setLdDecay: (options: Partial<LdDecayOptions>) => void;
  /** The last request of the distances the fake worker was given. */
  readonly lastPopDists: () => Request;
}

/** Makes the test page, whose one pass ends with `summary`, the
    variants file of `individuals`, s000 and s001 when absent. */
export function page(
  summary: JobResult,
  individuals: readonly string[] = ["s000", "s001"],
): TestPage {
  const requests: Request[] = [];
  const writes: WriteRequest[] = [];
  let lastId = 0;
  const store = createPopgen2Store({
    send: (key, job, onProgress) => {
      lastId += 1;
      return fakeRun(requests, lastId, key, job, onProgress);
    },
    sendWrite: (key, job, onProgress) => {
      lastId += 1;
      return fakeRun(writes, lastId, key, job, onProgress);
    },
    appVersion: "0.1.0",
  });
  store.popneiReady("0.2.2");
  const gate = createRunGate();
  const gated = gatedStore(store, gate);
  const auto = createAutoRuns({
    store,
    groups: POPGEN2_AUTO_GROUPS,
    start: (id) => startAnalysis(store, id),
    live: {
      analyses: POPGEN2_LIVE,
      changes: gate,
      runStart: (id) => startAnalysis(gated, id),
      quietMs: LIVE_QUIET_MS,
      endsLive: popgen2EndsLive,
    },
  });
  store.subscribe(() => {
    queueMicrotask(() => {
      auto.sync();
    });
  });
  const defects = createDefects();
  openVariantsFile(store, {
    fileId: FILE,
    name: "panel.nei",
    size: 261_490,
    format: "nei",
    readOptions: null,
  });
  store.variantsRead(FILE, {
    kind: "read",
    individuals,
    ploidy: 2,
    numVars: null,
    keepsPassed: false,
  });
  const setPca = (options: Partial<PcaOptions>): void => {
    gated.apply("the options of the PCA changed", (p: Project) =>
      setAnalysisOptions(p, pcaOnPopgen2, {
        ...pcaOptions(p, "popgen2"),
        ...options,
      }),
    );
  };
  setPca({ ld: { follow: false, maxAllowedR2: 0.1, maxDist: 50_000 } });
  const setDiversity = (options: Partial<DiversityOptions>): void => {
    gated.apply("the options of the diversity changed", (p: Project) =>
      setAnalysisOptions(p, diversityOnPopgen2, {
        ...diversityOptions(p),
        ...options,
      }),
    );
  };
  // The two individuals as one population, with a minimum and a draw
  // they meet, so that the diversity's Run is enabled.
  setDiversity({ minNumIndividuals: 2, numCalledAlleles: 4 });
  const setLdDecay = (options: Partial<LdDecayOptions>): void => {
    gated.apply("the options of the LD decay changed", (p: Project) =>
      setAnalysisOptions(p, ldDecayOnPopgen2, {
        ...ldDecayOptions(p),
        ...options,
      }),
    );
  };
  // A largest distance, which has no default, so that the LD decay's
  // Run is enabled.
  setLdDecay({ maxDist: 100_000 });
  const lastOf = (analysis: string): Request => {
    const last = requests.filter((r) => r.job.analysis === analysis).at(-1);
    if (last === undefined) throw new Error(`no ${analysis} was sent`);
    return last;
  };
  const testPage: TestPage = {
    store,
    auto,
    gate,
    defects,
    requests,
    writes,
    tab: "variants",
    now: 0,
    stoppingSince: null,
    stoppedMethod: null,
    band: () => bandOf(pageOf(testPage), defects.getState()),
    endPass: async () => {
      await flush();
      const pass = requests.find((r) => r.job.analysis === "variantsSummary");
      if (pass === undefined) throw new Error("the one pass did not start");
      pass.end({
        kind: "done",
        key: pass.key,
        result: summary,
      });
      await flush();
    },
    lastPca: () => lastOf("pca"),
    setPca,
    lastDiversity: () => lastOf("diversity"),
    setDiversity,
    lastLdDecay: () => lastOf("ldDecay"),
    setLdDecay,
    lastPopDists: () => lastOf("popDists"),
  };
  return testPage;
}

/** A result of the diversity of `s000` and `s001` as one population. */
export function diversityResult(): JobResult {
  return {
    analysis: "diversity",
    pops: ["Unclassified"],
    numIndividuals: Uint32Array.from([2]),
    unbiasedExpHet: Float64Array.from([0.3]),
    obsHet: Float64Array.from([0.3]),
    polyRatio: Float64Array.from([0.9]),
    numVarsWithValue: Uint32Array.from([548]),
    // As popnei gives them for one population: no F of a population
    // alone, no rarefied values at a draw none reaches, no private
    // alleles (core/testSupport.ts's `noPopDiversity`, which this file,
    // read by the band's tests alone, may not import).
    fis: Float64Array.from([NaN]),
    numAllelesMean: Float64Array.from([NaN]),
    numAllelesInDraw: Float64Array.from([NaN]),
    privateAllelesTotal: Float64Array.from([NaN]),
    privateAllelesMean: Float64Array.from([NaN]),
    privateAllelesInDraw: Float64Array.from([NaN]),
    numVarsInDraw: new Uint32Array(1),
    numVarsEveryPop: null,
    numVarsEveryPopInDraw: null,
    numCalledAlleles: 40,
    foldedSfs: [null],
    passStats: { numVars: 548, filtering: {} },
  };
}

/** A result of the LD decay of `s000` and `s001` as one population,
    Unclassified, at a largest distance of 100,000 bp: two individuals,
    whose every pair has an r² of 1, give pairs and no curve, as popnei
    gives them. */
export function ldDecayResult(): JobResult {
  const numBins = 50;
  const width = 100_000 / numBins;
  const pairs = Array.from({ length: numBins }, (_, b) => (b === 0 ? 3 : 0));
  return {
    analysis: "ldDecay",
    pops: ["Unclassified"],
    numIndividuals: Uint32Array.from([2]),
    numVars: Float64Array.from([548]),
    smallestDist: Float64Array.from(
      { length: numBins },
      (_, b) => b * width + 1,
    ),
    largestDist: Float64Array.from(
      { length: numBins },
      (_, b) => (b + 1) * width,
    ),
    numPairs: Float64Array.from(pairs),
    meanR2: Float64Array.from(pairs.map((n) => (n > 0 ? 1 : NaN))),
    sdR2: Float64Array.from(pairs.map((n) => (n > 0 ? 0 : NaN))),
    rhoPerBp: Float64Array.from([NaN]),
    r2AtZero: Float64Array.from([NaN]),
    halfDist: Float64Array.from([NaN]),
    passStats: { numVars: 548, filtering: {} },
  };
}

/** A result of the distances between A and B, `s000` and `s001`. */
export function popDistsResult(): JobResult {
  return {
    analysis: "popDists",
    pops: ["A", "B"],
    numIndividuals: Uint32Array.from([1, 1]),
    fst: Float64Array.from([0.1]),
    dest: Float64Array.from([0.05]),
    numVarsPerPair: Uint32Array.from([548]),
    order: {
      fst: { kind: "file", reason: "twoPopulations" },
      dest: { kind: "file", reason: "twoPopulations" },
    },
    leftOut: [],
    passStats: { numVars: 548, filtering: {} },
  };
}

/** Ends the last request of `analysis` of `testPage` with its result. */
export async function endLast(
  testPage: TestPage,
  analysis: Popgen2LiveId,
): Promise<void> {
  const ends: Readonly<
    Record<
      Popgen2LiveId,
      { readonly last: () => Request; readonly result: () => JobResult }
    >
  > = {
    pca: { last: testPage.lastPca, result: () => pcaResult("pca", 548) },
    diversity: { last: testPage.lastDiversity, result: diversityResult },
    ldDecay: { last: testPage.lastLdDecay, result: ldDecayResult },
    popDists: { last: testPage.lastPopDists, result: popDistsResult },
  };
  const last = ends[analysis].last();
  last.end({ kind: "done", key: last.key, result: ends[analysis].result() });
  await flush();
}

/** What the band reads of `testPage`. */
export function pageOf(testPage: TestPage): BandPage {
  return {
    state: testPage.store.getState(),
    startedUnder: (key) => testPage.auto.startedUnder(key),
    live: liveStatesOf(testPage.auto),
    tab: testPage.tab,
    now: testPage.now,
    stoppingSince: testPage.stoppingSince,
    stoppedMethod: testPage.stoppedMethod,
  };
}

/** The page with the PCA, or the PCoA, run by Run and ended with a
    result of `numVarsUsed` variants, fewer than its two individuals for
    a warning, with the LD pruning off for another when `pruningOff`. */
export async function pcaDone(
  summary: JobResult,
  method: PcaMethod,
  numVarsUsed: number,
  pruningOff = false,
): Promise<TestPage> {
  const testPage = page(summary);
  await testPage.endPass();
  if (method === "pcoa") testPage.setPca({ method: "pcoa" });
  // Off on this page is the LD pruning as in the Variants tab, which has
  // none.
  if (pruningOff) {
    testPage.setPca({ ld: { follow: true, maxAllowedR2: 0.1, maxDist: null } });
  }
  if (testPage.auto.run("pca") !== "started") {
    throw new Error("Run did not start the PCA");
  }
  await flush();
  const last = testPage.lastPca();
  last.end({
    kind: "done",
    key: last.key,
    result: pcaResult(method, numVarsUsed),
  });
  await flush();
  return testPage;
}
