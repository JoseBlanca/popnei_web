/**
 * The page of popgen2.html as its entry makes it, for the tests of the
 * band: the real store with a fake worker whose requests the test moves,
 * the gate, the analyses started by themselves, the log of the errors
 * and the tab shown (docs/specs/steps/popgen2-band.md, "How it is
 * checked"). Not part of the page.
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

export const FILE = "0123456789abcdef0123456789abcdef";

/** A request the fake worker was given, and how the test moves it. */
export interface Request {
  readonly key: string;
  readonly job: Job | WriteJob;
  readonly progress: (p: Progress) => void;
  readonly end: (outcome: Outcome<JobResult>) => void;
}

/** Lets the outcomes and the microtasks of the page's `sync` settle. */
export async function flush(): Promise<void> {
  for (let turn = 0; turn < 30; turn += 1) await Promise.resolve();
}

/** A result of the PCA, or of the PCoA, of `s000` and `s001`, with
    `numVarsUsed` variants. */
export function pcaResult(
  method: "pca" | "pcoa",
  numVarsUsed: number,
): JobResult {
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
  readonly store: Popgen2PageStore<JobResult, Blob>;
  readonly auto: AutoRuns;
  /** The gate the screens pass, whose holds the test takes. */
  readonly gate: RunGate;
  readonly defects: Defects;
  readonly requests: Request[];
  readonly writes: Request[];
  tab: PageTab;
  now: number;
  stoppingSince: number | null;
  stoppedMethod: PcaMethod | null;
  readonly band: () => Band;
  readonly endPass: () => Promise<void>;
  readonly lastPca: () => Request;
  readonly setPca: (options: Partial<PcaOptions>) => void;
}

export function page(summary: JobResult): TestPage {
  const requests: Request[] = [];
  const writes: Request[] = [];
  let lastId = 0;
  const sendOf =
    (into: Request[]) =>
    (
      key: string,
      job: Job | WriteJob,
      onProgress: (p: Progress) => void,
    ): Run<never> => {
      lastId += 1;
      const outcome = new Promise<Outcome<never>>((resolve) => {
        into.push({
          key,
          job,
          progress: onProgress,
          end: resolve as (outcome: Outcome<JobResult>) => void,
        });
      });
      return { id: lastId, outcome, cancel: () => undefined };
    };
  const store = createPopgen2Store({
    send: sendOf(requests),
    sendWrite: sendOf(writes),
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
      const pass = requests.find(
        (r) => "analysis" in r.job && r.job.analysis === "variantsSummary",
      );
      if (pass === undefined) throw new Error("the one pass did not start");
      pass.end({
        kind: "done",
        key: pass.key,
        result: summary,
      });
      await flush();
    },
    lastPca: () => {
      const found = requests.filter(
        (r) => "analysis" in r.job && r.job.analysis === "pca",
      );
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
  method: "pca" | "pcoa",
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
  if (!testPage.auto.run("pca")) throw new Error("Run did not start the PCA");
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
