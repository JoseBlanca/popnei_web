/**
 * The page of popgen2.html as its entry makes it, for the tests of the
 * band: the real store with a fake worker whose requests the test moves,
 * the gate, the analyses started by themselves, the log of the errors
 * and the tab shown (docs/specs/steps/popgen2-band.md, "How it is
 * checked"). Not part of the page: the lint keeps a file named
 * testSupport out of every module but the tests.
 */
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
import { failureEndsLive } from "../analyses/pca/liveEnd.ts";
import { LIVE_QUIET_MS, createAutoRuns } from "../autoRuns.ts";
import type { AutoRuns } from "../autoRuns.ts";
import { createDefects } from "../defects.ts";
import type { Defects } from "../defects.ts";
import {
  POPGEN2_AUTO_GROUPS,
  POPGEN2_LIVE,
  createPopgen2Store,
  openVariantsFile,
} from "../popgen2Store.ts";
import type { Popgen2PageStore } from "../popgen2Store.ts";
import { startAnalysis } from "../runs.ts";
import { createRunGate, gatedStore } from "../variants/thresholdRun.ts";
import type { RunGate } from "../variants/thresholdRun.ts";
import { bandOf } from "./bandLine.ts";
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
  /** The analyses the page starts by itself, the one pass and the PCA
      live. */
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
}

/** Makes the test page, whose one pass ends with `summary`. */
export function page(summary: JobResult): TestPage {
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
      endsLive: failureEndsLive,
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
    individuals: ["s000", "s001"],
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
    lastPca: () => {
      const found = requests.filter((r) => r.job.analysis === "pca");
      const last = found.at(-1);
      if (last === undefined) throw new Error("no PCA was sent");
      return last;
    },
    setPca,
  };
  return testPage;
}

/** What the band reads of `testPage`. */
export function pageOf(testPage: TestPage): BandPage {
  return {
    state: testPage.store.getState(),
    startedUnder: (key) => testPage.auto.startedUnder(key),
    pcaLive: testPage.auto.liveState("pca"),
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
