import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { individualChecks } from "../core/analyses/individualChecks.ts";
import { variantChecks } from "../core/analyses/variantChecks.ts";
import { variantsSummary } from "../core/analyses/variantsSummary.ts";
import { pcaOnPopgen2, pcaOptions } from "../core/analyses/pca.ts";
import { countsOf, firstProject } from "../core/apps.ts";
import { keyFromWire } from "../core/keys.ts";
import {
  loadIndividuals,
  loadVariants,
  setAnalysisOptions,
  setGrouping,
  setVariantFilter,
} from "../core/project.ts";
import type { VariantLoad } from "../core/project.ts";
import { createStore } from "../core/store.ts";
import type { AnalysisDef, AnalysisStatus, Store } from "../core/store.ts";
import { summaryResult } from "../core/testSupport.ts";
import type {
  Job,
  JobResult,
  Outcome,
  Run,
  RunError,
  VariantDistrib,
  WriteJob,
} from "../worker/protocol.ts";
import { LIVE_QUIET_MS, createAutoRuns } from "./autoRuns.ts";
import type { AutoRuns } from "./autoRuns.ts";
import {
  POPGEN2_AUTO_GROUPS,
  POPGEN2_CHAIN,
  POPGEN2_LIVE,
  createPopgen2Store,
  openVariantsFile,
} from "./popgen2Store.ts";
import type { Popgen2PageStore } from "./popgen2Store.ts";
import { startAnalysis, startWriting } from "./runs.ts";
import {
  createRunGate,
  createThresholdRun,
  gatedStore,
} from "./variants/thresholdRun.ts";
import type { RunGate } from "./variants/thresholdRun.ts";
import { SUMMARY_ID } from "./variants/words.ts";
import { failureEndsLive } from "./analyses/pca/liveEnd.ts";

const ID = SUMMARY_ID;

/** A request the fake `send` was given: its key, its job, whether the
    store cancelled it, and how the test ends it. */
interface Request {
  readonly key: string;
  readonly job: Job;
  cancelled: boolean;
  readonly end: (outcome: Outcome<JobResult>) => void;
}

/** An analysis that a `.nei` file locks, made for the test from the
    histograms of the variants under another id, for a group with a member
    that starts nothing and holds back nothing. It is never started on a
    `.nei` file. */
const LOCKED_ON_NEI: AnalysisDef<Job, JobResult> = Object.freeze({
  ...variantChecks,
  id: "lockedOnNei",
  needs: (p: Parameters<typeof variantChecks.needs>[0]) =>
    p.variants?.format === "nei" ? "Not for a .nei file." : null,
});

/** The analyses a test may start by itself, by their ids: the summary of
    popgen2.html, two analyses of the old page that make a second group
    after it, as the statistics of the open file were before the one pass
    (docs/plans/file-stats.md), and one locked on a `.nei` file. */
const DEFS: ReadonlyMap<string, AnalysisDef<Job, JobResult>> = new Map([
  [variantsSummary.id, variantsSummary],
  [variantChecks.id, variantChecks],
  [individualChecks.id, individualChecks],
  [LOCKED_ON_NEI.id, LOCKED_ON_NEI],
]);

/** A store as that of the new page, with the analyses of `groups` and a
    fake `send` whose requests the test ends by hand, and the analyses it
    starts by itself, `groups`, the page's one pass unless given, with no
    live analysis. */
function setUp(groups: readonly (readonly string[])[] = [POPGEN2_CHAIN]): {
  readonly store: Store<JobResult, Blob>;
  readonly sent: ((outcome: Outcome<JobResult>) => void)[];
  readonly requests: Request[];
  readonly auto: ReturnType<typeof createAutoRuns>;
  readonly status: (id?: string) => AnalysisStatus<JobResult>;
} {
  const sent: ((outcome: Outcome<JobResult>) => void)[] = [];
  const requests: Request[] = [];
  let lastId = 0;
  const store = createStore<Job, JobResult, Blob>({
    first: firstProject("popgen"),
    analyses: groups.flat().map((id) => {
      const def = DEFS.get(id);
      if (def === undefined) throw new Error(`no analysis ${id}`);
      return def;
    }),
    countsOf,
    counts: null,
    statistics: null,
    write: null,
    cacheMaxBytes: 100_000_000,
    maxUndoSteps: 100,
    send: (key, job): Run<JobResult> => {
      lastId += 1;
      let request: Request | null = null;
      const outcome = new Promise<Outcome<JobResult>>((resolve) => {
        sent.push(resolve);
        request = { key, job, cancelled: false, end: resolve };
        requests.push(request);
      });
      return {
        id: lastId,
        outcome,
        cancel: () => {
          if (request !== null) request.cancelled = true;
        },
      };
    },
    appVersion: "0.1.0",
  });
  store.popneiReady("0.1.0");
  const auto = createAutoRuns({
    store,
    groups,
    start: (id) => startAnalysis(store, id),
    live: null,
  });
  const status = (id: string = ID): AnalysisStatus<JobResult> => {
    const view = store.getState().analyses.find((a) => a.id === id);
    if (view === undefined) throw new Error(`no ${id} in the store`);
    return view.status;
  };
  return { store, sent, requests, auto, status };
}

/** Loads `panel.nei` under `fileId`, or `low_qual.vcf.gz` as the page
    opens a VCF when `format` is "vcf", and records its read. */
function open(
  store: Store<JobResult, Blob>,
  fileId: string,
  format: "nei" | "vcf" = "nei",
): void {
  store.apply("a new variants file was loaded", (p) =>
    loadVariants(
      p,
      format === "nei"
        ? {
            fileId,
            name: "panel.nei",
            size: 261_490,
            format: "nei",
            readOptions: null,
          }
        : {
            fileId,
            name: "low_qual.vcf.gz",
            size: 30_000,
            format: "vcf",
            readOptions: { ploidy: null, onlyPassed: false },
          },
    ),
  );
  store.variantsRead(fileId, {
    kind: "read",
    individuals: ["i1", "i2"],
    ploidy: 2,
    numVars: null,
    keepsPassed: true,
  });
}

/** Lets the outcomes given settle through `startAnalysis`. */
async function settled(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/** A result of the summary: 1,200 variants on the chromosome 1. */
const SUMMARY: JobResult = summaryResult(["1"], [1200]);

/** The second group of the tests of two groups. */
const STATS_IDS: readonly string[] = ["variantChecks", "individualChecks"];

const FIRST = "0123456789abcdef0123456789abcdef";
const SECOND = "fedcba9876543210fedcba9876543210";

describe("the analyses the new page starts by itself", () => {
  test("nothing starts before a file is read", () => {
    const { auto, sent } = setUp();
    auto.sync();
    expect(sent).toHaveLength(0);
  });

  test("a file read starts the summary once, however often the page syncs", () => {
    const { store, auto, sent, status } = setUp();
    open(store, FIRST);

    auto.sync();
    auto.sync();

    expect(sent).toHaveLength(1);
    expect(status().kind).toBe("running");
  });

  test("a failure is not started again by itself, and Start again starts it", async () => {
    const { store, auto, sent, status } = setUp();
    open(store, FIRST);
    auto.sync();
    sent[0]?.({
      kind: "failed",
      error: { kind: "workerFailed", message: "out of memory" },
    });
    await settled();
    expect(status().kind).toBe("error");

    auto.sync();
    expect(sent).toHaveLength(1);

    auto.resume(POPGEN2_CHAIN);
    expect(sent).toHaveLength(2);
    expect(status().kind).toBe("running");
  });

  test("a Stop leaves the summary ready under a key it was started under, and Start again starts it", async () => {
    const { store, auto, sent, status } = setUp();
    open(store, FIRST);
    auto.sync();

    store.cancelRun(ID);
    sent[0]?.({ kind: "cancelled" });
    await settled();
    auto.sync();

    const stopped = status();
    expect(stopped.kind).toBe("ready");
    if (stopped.kind !== "ready") return;
    expect(auto.startedUnder(stopped.key)).toBe(true);
    expect(sent).toHaveLength(1);

    auto.resume(POPGEN2_CHAIN);
    expect(sent).toHaveLength(2);
  });

  test("stop of the page's one group stops the pass running, and one about to start before it is started, and resume starts it", async () => {
    const running = setUp();
    open(running.store, FIRST);
    running.auto.sync();
    running.auto.stop(POPGEN2_CHAIN);
    expect(running.requests[0]?.cancelled).toBe(true);
    running.sent[0]?.({ kind: "cancelled" });
    await settled();
    running.auto.sync();
    expect(running.sent).toHaveLength(1);

    const aboutTo = setUp();
    open(aboutTo.store, FIRST);
    aboutTo.auto.stop(POPGEN2_CHAIN);
    aboutTo.auto.sync();
    expect(aboutTo.sent).toHaveLength(0);
    const stopped = aboutTo.status();
    expect(
      stopped.kind === "ready" && aboutTo.auto.startedUnder(stopped.key),
    ).toBe(true);
    aboutTo.auto.resume(POPGEN2_CHAIN);
    expect(aboutTo.sent).toHaveLength(1);
  });

  test("a new file starts the summary again, under its own key", async () => {
    const { store, auto, sent, status } = setUp();
    open(store, FIRST);
    auto.sync();
    store.cancelRun(ID);
    sent[0]?.({ kind: "cancelled" });
    await settled();

    open(store, SECOND);
    auto.sync();

    expect(sent).toHaveLength(2);
    const running = status();
    expect(running.kind).toBe("running");
    if (running.kind !== "running") return;
    expect(auto.startedUnder(running.key)).toBe(true);
  });

  test("resume does nothing while the summary is running or done", async () => {
    const { store, auto, sent, status } = setUp();
    open(store, FIRST);
    auto.sync();

    auto.resume(POPGEN2_CHAIN);
    expect(sent).toHaveLength(1);

    const running = status();
    if (running.kind !== "running") throw new Error("not running");
    sent[0]?.({ kind: "done", key: running.key, result: SUMMARY });
    await settled();
    expect(status().kind).toBe("done");

    auto.resume(POPGEN2_CHAIN);
    auto.sync();
    expect(sent).toHaveLength(1);
  });
});

/** A histogram of the variants of 2 bins, all 1,200 in the first. */
function distrib(mean: number): VariantDistrib {
  return { mean, counts: Uint32Array.from([1200, 0]) };
}

/** The result of each analysis the page starts, by its id, over the two
    individuals of the file `open` reads. */
const RESULTS: ReadonlyMap<string, JobResult> = new Map<string, JobResult>([
  [ID, SUMMARY],
  [
    "individualChecks",
    {
      analysis: "individualChecks",
      individuals: ["i1", "i2"],
      missingGtRate: Float64Array.from([0.02, 0.04]),
      obsHetRate: Float64Array.from([0.3, 0.4]),
      passStats: { numVars: 1200, filtering: {} },
    },
  ],
  [
    "variantChecks",
    {
      analysis: "variantChecks",
      binEdges: Float64Array.from([0, 0.5, 1]),
      missingRate: distrib(0.03),
      maf: distrib(0.7),
      obsHet: distrib(0.35),
      unbiasedExpHet: distrib(0.37),
      passStats: { numVars: 1200, filtering: {} },
    },
  ],
]);

/** Ends `request` with the result of its analysis, under its key. */
function endDone(request: Request | undefined): void {
  if (request === undefined) throw new Error("no such request");
  const result = RESULTS.get(request.job.analysis);
  if (result === undefined) throw new Error("no result for the request");
  request.end({ kind: "done", key: request.key, result });
}

/** The analyses of the requests sent, in their order. */
function analysesOf(requests: readonly Request[]): readonly string[] {
  return requests.map((request) => request.job.analysis);
}

/** Ends `request` with the failure `error`. */
function fail(request: Request | undefined, error: RunError): void {
  if (request === undefined) throw new Error("no such request");
  request.end({ kind: "failed", error });
}

describe("two groups, a count and then two statistics after it, one after the other", () => {
  const PAGE_GROUPS = [[ID], STATS_IDS];
  const PAGE_IDS = PAGE_GROUPS.flat();
  const VARIANTS = "variantChecks";
  const INDIVIDUALS = "individualChecks";

  /** The page with a file open and its count done, and the histograms of
      the variants running, the second request. */
  async function countDone(): Promise<ReturnType<typeof setUp>> {
    const page = setUp(PAGE_GROUPS);
    open(page.store, FIRST);
    page.auto.sync();
    endDone(page.requests[0]);
    await settled();
    page.auto.sync();
    return page;
  }

  test("the count starts alone; once done, the histograms of the variants; once they are done, the statistics of each individual", async () => {
    const { store, requests, auto, status } = setUp(PAGE_GROUPS);
    open(store, FIRST);
    auto.sync();
    expect(analysesOf(requests)).toEqual([ID]);
    expect(status(VARIANTS).kind).toBe("ready");

    endDone(requests[0]);
    await settled();
    auto.sync();
    expect(analysesOf(requests)).toEqual([ID, VARIANTS]);
    expect(requests[1]?.job).toMatchObject({
      analysis: VARIANTS,
      individuals: null,
    });
    expect(status(INDIVIDUALS).kind).toBe("ready");

    endDone(requests[1]);
    await settled();
    auto.sync();
    expect(analysesOf(requests)).toEqual([ID, VARIANTS, INDIVIDUALS]);

    endDone(requests[2]);
    await settled();
    auto.sync();
    expect(requests).toHaveLength(3);
    expect(PAGE_IDS).toEqual([ID, VARIANTS, INDIVIDUALS]);
    expect(PAGE_IDS.map((id) => status(id).kind)).toEqual([
      "done",
      "done",
      "done",
    ]);
  });

  test("the count's Stop leaves the statistics not started, and Start again starts the count and then them", async () => {
    const { store, requests, auto, status } = setUp(PAGE_GROUPS);
    open(store, FIRST);
    auto.sync();
    store.cancelRun(ID);
    requests[0]?.end({ kind: "cancelled" });
    await settled();
    auto.sync();
    expect(requests).toHaveLength(1);
    const variants = status(VARIANTS);
    expect(variants.kind).toBe("ready");
    if (variants.kind !== "ready") return;
    expect(auto.startedUnder(variants.key)).toBe(false);

    auto.resume([ID]);
    expect(analysesOf(requests)).toEqual([ID, ID]);
    endDone(requests[1]);
    await settled();
    auto.sync();
    expect(analysesOf(requests)).toEqual([ID, ID, VARIANTS]);
  });

  test("stop of the statistics while the histograms of the variants run cancels them, and the statistics of each individual do not start", async () => {
    const { requests, auto, status } = await countDone();

    auto.stop(STATS_IDS);
    expect(requests[1]?.cancelled).toBe(true);
    requests[1]?.end({ kind: "cancelled" });
    await settled();
    auto.sync();

    expect(requests).toHaveLength(2);
    expect(status(ID).kind).toBe("done");
    const stopped = status(VARIANTS);
    expect(stopped.kind).toBe("ready");
    if (stopped.kind !== "ready") return;
    expect(auto.startedUnder(stopped.key)).toBe(true);
    expect(status(INDIVIDUALS).kind).toBe("ready");
  });

  test("stop of the statistics after the first pass ends and before the second starts keeps the second from starting", async () => {
    const { requests, auto, status } = await countDone();
    endDone(requests[1]);
    await settled();
    // The page has not synced yet: the second pass is about to start.
    auto.stop(STATS_IDS);
    auto.sync();

    expect(requests).toHaveLength(2);
    const individuals = status(INDIVIDUALS);
    expect(individuals.kind).toBe("ready");
    if (individuals.kind !== "ready") return;
    expect(auto.startedUnder(individuals.key)).toBe(true);
    expect(auto.resume(STATS_IDS)).toBe(true);
    expect(analysesOf(requests)).toEqual([ID, VARIANTS, INDIVIDUALS]);
  });

  test("the page is told of every change of what autoRuns knows: a start, a stop with nothing running, and a resume", async () => {
    const { store, requests, auto } = setUp(PAGE_GROUPS);
    let told = 0;
    const unsubscribe = auto.subscribe(() => {
      told += 1;
    });
    const version = auto.getVersion();
    open(store, FIRST);
    auto.sync();
    expect(told).toBe(1);
    expect(auto.getVersion()).not.toBe(version);

    endDone(requests[0]);
    await settled();
    auto.sync();
    endDone(requests[1]);
    await settled();
    const between = auto.getVersion();
    expect(auto.getVersion()).toBe(between);
    auto.stop(STATS_IDS);
    expect(auto.getVersion()).not.toBe(between);
    const afterStop = told;

    auto.resume(STATS_IDS);
    expect(told).toBeGreaterThan(afterStop);

    unsubscribe();
    const last = told;
    auto.stop(STATS_IDS);
    expect(told).toBe(last);
  });

  test("resume after a stop of the histograms of the variants starts them again, and the statistics of each individual after them", async () => {
    const { requests, auto } = await countDone();
    auto.stop(STATS_IDS);
    requests[1]?.end({ kind: "cancelled" });
    await settled();

    expect(auto.resume(STATS_IDS)).toBe(true);
    expect(analysesOf(requests)).toEqual([ID, VARIANTS, VARIANTS]);
    endDone(requests[2]);
    await settled();
    auto.sync();
    expect(analysesOf(requests).at(-1)).toBe(INDIVIDUALS);
    expect(requests).toHaveLength(4);
  });

  test("stop while the statistics of each individual run cancels them alone, and resume starts them, not the histograms of the variants, which are done", async () => {
    const { requests, auto, status } = await countDone();
    endDone(requests[1]);
    await settled();
    auto.sync();

    auto.stop(STATS_IDS);
    expect(requests.map((request) => request.cancelled)).toEqual([
      false,
      false,
      true,
    ]);
    requests[2]?.end({ kind: "cancelled" });
    await settled();
    auto.sync();
    expect(requests).toHaveLength(3);
    expect(status(VARIANTS).kind).toBe("done");
    expect(status(INDIVIDUALS).kind).toBe("ready");

    expect(auto.resume(STATS_IDS)).toBe(true);
    expect(analysesOf(requests)).toEqual([
      ID,
      VARIANTS,
      INDIVIDUALS,
      INDIVIDUALS,
    ]);
  });

  test("resume does nothing while one of the statistics runs, nor once both are done", async () => {
    const { requests, auto } = await countDone();

    expect(auto.resume(STATS_IDS)).toBe(false);
    expect(requests).toHaveLength(2);

    endDone(requests[1]);
    await settled();
    auto.sync();
    endDone(requests[2]);
    await settled();
    auto.sync();
    expect(auto.resume(STATS_IDS)).toBe(false);
    expect(requests).toHaveLength(3);
  });

  test("stop does nothing when none of the statistics runs and the count does: the count goes on, and the statistics start after it", async () => {
    const { store, requests, auto, status } = setUp(PAGE_GROUPS);
    open(store, FIRST);
    auto.sync();

    auto.stop(STATS_IDS);
    expect(requests[0]?.cancelled).toBe(false);
    expect(status(ID).kind).toBe("running");

    endDone(requests[0]);
    await settled();
    auto.sync();
    expect(analysesOf(requests)).toEqual([ID, VARIANTS]);
  });

  test("a crash of the histograms of the variants does not hold back the statistics of each individual, and resume then starts the histograms again", async () => {
    const { requests, auto, status } = await countDone();
    fail(requests[1], { kind: "workerFailed", message: "out of memory" });
    await settled();
    auto.sync();
    expect(status(VARIANTS).kind).toBe("error");
    expect(analysesOf(requests)).toEqual([ID, VARIANTS, INDIVIDUALS]);

    expect(auto.resume(STATS_IDS)).toBe(false);
    endDone(requests[2]);
    await settled();
    auto.sync();
    expect(requests).toHaveLength(3);

    expect(auto.resume(STATS_IDS)).toBe(true);
    expect(analysesOf(requests).at(-1)).toBe(VARIANTS);
  });

  test("a defect of ours in the histograms of the variants does not hold back the statistics of each individual, and no start again is offered for it", async () => {
    const { requests, auto } = await countDone();
    fail(requests[1], {
      kind: "defect",
      message: "a message that did not validate",
    });
    await settled();
    auto.sync();
    expect(analysesOf(requests).at(-1)).toBe(INDIVIDUALS);
    endDone(requests[2]);
    await settled();
    auto.sync();
    expect(auto.resume(STATS_IDS)).toBe(false);
    expect(requests).toHaveLength(3);
  });

  test("popnei's refusal of the histograms of the variants holds back the statistics of each individual, and resume starts nothing", async () => {
    const { requests, auto, status } = await countDone();
    fail(requests[1], { kind: "popnei", message: "not a VCF" });
    await settled();
    auto.sync();
    expect(status(VARIANTS).kind).toBe("error");
    expect(requests).toHaveLength(2);

    expect(auto.resume(STATS_IDS)).toBe(false);
    expect(requests).toHaveLength(2);
  });

  test("a variants file the browser could not read again puts both statistics in error, and resume starts nothing", async () => {
    const { requests, auto, status } = await countDone();
    fail(requests[1], {
      kind: "reopenFailed",
      name: "panel.nei",
      message: "changed",
    });
    await settled();
    auto.sync();
    expect(status(VARIANTS).kind).toBe("error");
    expect(status(INDIVIDUALS).kind).toBe("error");
    expect(requests).toHaveLength(2);

    expect(auto.resume(STATS_IDS)).toBe(false);
    expect(requests).toHaveLength(2);
  });

  for (const error of [
    { kind: "couldNotStart", reason: "no worker" },
    { kind: "protocolMismatch" },
    { kind: "defect", message: "a message that did not validate" },
  ] as const) {
    test(`resume starts nothing after ${error.kind}, which only a reload mends, though the chain steps past it`, async () => {
      const { requests, auto, status } = await countDone();
      fail(requests[1], error);
      await settled();
      auto.sync();
      expect(status(VARIANTS).kind).toBe("error");
      expect(analysesOf(requests).at(-1)).toBe(INDIVIDUALS);
      endDone(requests[2]);
      await settled();
      auto.sync();
      expect(auto.resume(STATS_IDS)).toBe(false);
      expect(requests).toHaveLength(3);
    });
  }

  test("a crash of the count holds back the statistics, which wait for the count", async () => {
    const { store, requests, auto } = setUp(PAGE_GROUPS);
    open(store, FIRST);
    auto.sync();
    fail(requests[0], { kind: "workerFailed", message: "out of memory" });
    await settled();
    auto.sync();
    expect(requests).toHaveLength(1);
    expect(auto.resume(STATS_IDS)).toBe(false);
    expect(requests).toHaveLength(1);
  });

  test("after the count's Stop the statistics are not calculated because the count was stopped, and resume of the statistics starts nothing", async () => {
    const { store, requests, auto, status } = setUp(PAGE_GROUPS);
    open(store, FIRST);
    auto.sync();
    store.cancelRun(ID);
    requests[0]?.end({ kind: "cancelled" });
    await settled();
    auto.sync();
    expect(requests).toHaveLength(1);

    expect(auto.resume(STATS_IDS)).toBe(false);
    expect(requests).toHaveLength(1);
    expect(PAGE_IDS.map((id) => status(id).kind)).toEqual([
      "ready",
      "ready",
      "ready",
    ]);
  });

  test("after a crash of the histograms of the variants and a stop of the statistics of each individual, resume starts both, one after the other", async () => {
    const { requests, auto, status } = await countDone();
    fail(requests[1], { kind: "workerFailed", message: "out of memory" });
    await settled();
    auto.sync();
    auto.stop(STATS_IDS);
    requests[2]?.end({ kind: "cancelled" });
    await settled();
    auto.sync();

    expect(auto.resume(STATS_IDS)).toBe(true);
    expect(analysesOf(requests).at(-1)).toBe(VARIANTS);
    const individuals = status(INDIVIDUALS);
    if (individuals.kind !== "ready") throw new Error("not ready");
    expect(auto.startedUnder(individuals.key)).toBe(false);

    endDone(requests[3]);
    await settled();
    auto.sync();
    expect(analysesOf(requests)).toEqual([
      ID,
      VARIANTS,
      INDIVIDUALS,
      VARIANTS,
      INDIVIDUALS,
    ]);
  });

  test("a stop after resume keeps the rest of the group from starting", async () => {
    const { requests, auto, status } = await countDone();
    fail(requests[1], { kind: "workerFailed", message: "out of memory" });
    await settled();
    auto.sync();
    auto.stop(STATS_IDS);
    requests[2]?.end({ kind: "cancelled" });
    await settled();
    auto.sync();
    auto.resume(STATS_IDS);

    auto.stop(STATS_IDS);
    requests[3]?.end({ kind: "cancelled" });
    await settled();
    auto.sync();
    expect(requests).toHaveLength(4);
    const variants = status(VARIANTS);
    if (variants.kind !== "ready") throw new Error("not ready");
    expect(auto.startedUnder(variants.key)).toBe(true);
  });

  test("stop and resume of a list that is not a group is a defect", () => {
    const { auto } = setUp(PAGE_GROUPS);
    expect(() => {
      auto.stop([INDIVIDUALS]);
    }).toThrow(/popnei_web defect/);
    expect(() => auto.resume([ID, VARIANTS])).toThrow(/popnei_web defect/);
  });

  test("a new file while the statistics run stops them, and starts the count of the new file alone", async () => {
    const { store, requests, auto } = await countDone();

    open(store, SECOND);
    expect(requests[1]?.cancelled).toBe(true);
    requests[1]?.end({ kind: "cancelled" });
    await settled();
    auto.sync();
    expect(analysesOf(requests)).toEqual([ID, VARIANTS, ID]);
  });
});

describe("one group of two, the summary and an analysis after it", () => {
  const CHAIN = [ID, "variantChecks"];
  const AFTER = "variantChecks";

  test("a Stop while the summary runs stops the chain, and resume starts the summary and then the one after it", async () => {
    const { store, requests, auto } = setUp([CHAIN]);
    open(store, FIRST);
    auto.sync();
    auto.stop(CHAIN);
    expect(requests[0]?.cancelled).toBe(true);
    requests[0]?.end({ kind: "cancelled" });
    await settled();
    auto.sync();
    expect(requests).toHaveLength(1);

    expect(auto.resume(CHAIN)).toBe(true);
    endDone(requests[1]);
    await settled();
    auto.sync();
    expect(analysesOf(requests)).toEqual([ID, ID, AFTER]);
  });

  test("a Stop of the one after the summary, the summary done, and resume starts that one alone", async () => {
    const { store, requests, auto, status } = setUp([CHAIN]);
    open(store, FIRST);
    auto.sync();
    endDone(requests[0]);
    await settled();
    auto.sync();
    auto.stop(CHAIN);
    expect(requests[1]?.cancelled).toBe(true);
    requests[1]?.end({ kind: "cancelled" });
    await settled();
    auto.sync();
    expect(status(ID).kind).toBe("done");
    expect(requests).toHaveLength(2);

    expect(auto.resume(CHAIN)).toBe(true);
    expect(analysesOf(requests)).toEqual([ID, AFTER, AFTER]);
  });

  test("a crash of the summary does not hold back the one after it, and once that one is done resume starts the summary again", async () => {
    const { store, requests, auto } = setUp([CHAIN]);
    open(store, FIRST);
    auto.sync();
    fail(requests[0], { kind: "workerFailed", message: "out of memory" });
    await settled();
    auto.sync();
    expect(analysesOf(requests)).toEqual([ID, AFTER]);
    expect(auto.resume(CHAIN)).toBe(false);

    endDone(requests[1]);
    await settled();
    auto.sync();
    expect(auto.resume(CHAIN)).toBe(true);
    expect(analysesOf(requests)).toEqual([ID, AFTER, ID]);
  });
});

describe("one-pass the chain of popgen2.html: the summary alone", () => {
  test("the page's group of the one pass is the summary alone, and the PCA, live, comes after it", () => {
    expect(POPGEN2_CHAIN).toEqual([ID]);
    expect(POPGEN2_AUTO_GROUPS).toEqual([POPGEN2_CHAIN, POPGEN2_LIVE]);
    expect(POPGEN2_LIVE).toEqual(["pca"]);
  });

  test("on a VCF the summary done ends the chain: nothing more is sent, and Start again is not offered", async () => {
    const { store, requests, auto, status } = setUp();
    open(store, FIRST, "vcf");
    auto.sync();
    expect(analysesOf(requests)).toEqual([ID]);
    endDone(requests[0]);
    await settled();
    auto.sync();
    auto.sync();
    expect(analysesOf(requests)).toEqual([ID]);
    expect(status(ID).kind).toBe("done");
    expect(auto.resume(POPGEN2_CHAIN)).toBe(false);
  });

  test("popnei's refusal of the summary ends the chain, and Start again starts nothing", async () => {
    const { store, requests, auto } = setUp();
    open(store, FIRST, "vcf");
    auto.sync();
    fail(requests[0], { kind: "popnei", message: "not a VCF" });
    await settled();
    auto.sync();
    expect(requests).toHaveLength(1);
    expect(auto.resume(POPGEN2_CHAIN)).toBe(false);
  });
});

describe("live-stats 3 a locked member of a group starts nothing and holds back nothing", () => {
  const LOCKED = LOCKED_ON_NEI.id;
  /** A group whose middle member is locked on a `.nei` file. */
  const GROUP = [ID, LOCKED, "variantChecks"];

  test("the summary done, the middle one locked, the one after it starts by itself", async () => {
    const { store, requests, auto, status } = setUp([GROUP]);
    open(store, FIRST, "nei");
    auto.sync();
    endDone(requests[0]);
    await settled();
    auto.sync();
    expect(status(LOCKED).kind).toBe("locked");
    expect(analysesOf(requests)).toEqual([ID, "variantChecks"]);
  });

  test("a Stop of the one after it, and resume starts that one, passing over the locked one", async () => {
    const { store, requests, auto, status } = setUp([GROUP]);
    open(store, FIRST, "nei");
    auto.sync();
    endDone(requests[0]);
    await settled();
    auto.sync();
    auto.stop(GROUP);
    expect(requests[1]?.cancelled).toBe(true);
    requests[1]?.end({ kind: "cancelled" });
    await settled();
    auto.sync();
    expect(requests).toHaveLength(2);

    expect(auto.resume(GROUP)).toBe(true);
    expect(analysesOf(requests)).toEqual([
      ID,
      "variantChecks",
      "variantChecks",
    ]);
    endDone(requests[2]);
    await settled();
    auto.sync();
    expect(status("variantChecks").kind).toBe("done");
    expect(auto.resume(GROUP)).toBe(false);
  });
});

/** A request of the page's store with the PCA live: its key, its job,
    whether it was cancelled, and how the test ends it. */
interface LiveRequest {
  readonly key: string;
  readonly job: Job | WriteJob;
  cancelled: boolean;
  readonly end: (outcome: Outcome<JobResult>) => void;
}

/** A result of the PCA of `s000` and `s001`. */
function pcaResult(): JobResult {
  return {
    analysis: "pca",
    method: "pca",
    individuals: ["s000", "s001"],
    numComps: 1,
    numCompsFound: 1,
    projections: Float64Array.from([1, -1]),
    explainedVariancePercent: Float64Array.from([100]),
    numVarsUsed: 548,
    lingoesConstant: null,
    negativeEigenvaluesPercent: null,
    passStats: { numVars: 548, filtering: {} },
  };
}

/** Lets every promise the fake worker's outcomes settle, through
    `startAnalysis`, and the microtasks of the page's `sync`, with the
    clock stopped. */
async function flush(): Promise<void> {
  for (let turn = 0; turn < 30; turn += 1) await Promise.resolve();
}

/** The load of `panel.nei` under `fileId`. */
function panelLoad(fileId: string): VariantLoad {
  return {
    fileId,
    name: "panel.nei",
    size: 261_490,
    format: "nei",
    readOptions: null,
  };
}

/**
 * The store of popgen2.html as its entry makes it, with a fake worker
 * whose requests the test ends, the gate of the page, its screens'
 * store passing the gate, and the analyses started by themselves with
 * the PCA live once Run is pressed; `panel.nei` open, read with `s000`
 * and `s001`, the one pass done, and the LD distance typed, 50,000, so
 * that the PCA is ready. The page's `sync` after every change of the
 * store, in a microtask, as the entry calls it.
 */
async function livePage(
  individuals: readonly string[] = ["s000", "s001"],
): Promise<{
  readonly raw: Popgen2PageStore<JobResult, Blob>;
  readonly store: Popgen2PageStore<JobResult, Blob>;
  readonly gate: RunGate;
  readonly auto: AutoRuns;
  readonly requests: LiveRequest[];
  readonly writes: LiveRequest[];
  readonly pcaRequests: () => readonly LiveRequest[];
  readonly pca: () => AnalysisStatus<JobResult>;
  readonly endPca: (outcome?: Outcome<JobResult>) => Promise<void>;
  readonly setMissing: (value: number) => void;
  readonly setDistance: (value: number | null) => void;
  readonly events: string[];
}> {
  const requests: LiveRequest[] = [];
  const writes: LiveRequest[] = [];
  let lastId = 0;
  const sendOf =
    (into: LiveRequest[]) =>
    (key: string, job: Job | WriteJob): Run<never> => {
      lastId += 1;
      let request: LiveRequest | null = null;
      const outcome = new Promise<Outcome<never>>((resolve) => {
        request = {
          key,
          job,
          cancelled: false,
          end: resolve as (outcome: Outcome<JobResult>) => void,
        };
        into.push(request);
      });
      return {
        id: lastId,
        outcome,
        cancel: () => {
          if (request !== null) request.cancelled = true;
        },
      };
    };
  const raw = createPopgen2Store({
    send: sendOf(requests),
    sendWrite: sendOf(writes),
    appVersion: "0.1.0",
  });
  raw.popneiReady("0.2.2");
  const gate = createRunGate();
  const store = gatedStore(raw, gate);
  const auto = createAutoRuns({
    store: raw,
    groups: POPGEN2_AUTO_GROUPS,
    start: (id) => startAnalysis(raw, id),
    live: {
      analyses: POPGEN2_LIVE,
      changes: gate,
      runStart: (id) => startAnalysis(store, id),
      quietMs: LIVE_QUIET_MS,
      endsLive: failureEndsLive,
    },
  });
  const events: string[] = [];
  auto.onLive((event) => {
    events.push(`${event.kind} ${event.id}`);
  });
  raw.subscribe(() => {
    queueMicrotask(() => {
      auto.sync();
    });
  });
  openVariantsFile(store, panelLoad(FIRST));
  raw.variantsRead(FIRST, {
    kind: "read",
    individuals,
    ploidy: 2,
    numVars: null,
    keepsPassed: false,
  });
  const setDistance = (value: number | null): void => {
    store.apply("the LD distance of the PCA changed", (p) =>
      setAnalysisOptions(p, pcaOnPopgen2, {
        ...pcaOptions(p, "popgen2"),
        ld: { follow: false, maxAllowedR2: 0.1, maxDist: value },
      }),
    );
  };
  setDistance(50_000);
  await flush();
  const pass = requests[0];
  if (
    pass === undefined ||
    !("analysis" in pass.job) ||
    pass.job.analysis !== "variantsSummary"
  ) {
    throw new Error("the one pass did not start");
  }
  pass.end({
    kind: "done",
    key: pass.key,
    result: summaryResult(["1"], [1200], individuals),
  });
  await flush();
  const pcaRequests = (): readonly LiveRequest[] =>
    requests.filter((r) => "analysis" in r.job && r.job.analysis === "pca");
  const pca = (): AnalysisStatus<JobResult> => {
    const view = raw.getState().analyses.find((a) => a.id === "pca");
    if (view === undefined) throw new Error("no PCA in the store");
    return view.status;
  };
  return {
    raw,
    store,
    gate,
    auto,
    requests,
    writes,
    pcaRequests,
    pca,
    endPca: async (outcome) => {
      const last = pcaRequests().at(-1);
      if (last === undefined) throw new Error("no PCA was sent");
      last.end(outcome ?? { kind: "done", key: last.key, result: pcaResult() });
      await flush();
    },
    setMissing: (value) => {
      store.apply("the missing data filter changed", (p) =>
        setVariantFilter(p, {
          kind: "missing_data",
          maxAllowedMissingRate: value,
        }),
      );
    },
    setDistance,
    events,
  };
}

/** Moves the clock of the test by `ms`, and lets what it starts settle. */
async function wait(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
  await flush();
}

/** The page with the PCA run by Run and ended with its result. */
async function liveDone(): Promise<Awaited<ReturnType<typeof livePage>>> {
  const page = await livePage();
  expect(page.auto.run("pca")).toBe(true);
  await page.endPca();
  expect(page.pca().kind).toBe("done");
  return page;
}

describe("NU4 D1 the PCA calculated again by itself", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test("the PCA ready does not start before Run, however long the page waits", async () => {
    const page = await livePage();
    expect(page.pca().kind).toBe("ready");
    page.setMissing(0.05);
    await wait(5000);
    expect(page.pcaRequests()).toHaveLength(0);
    expect(page.auto.isLive("pca")).toBe(false);
    expect(page.auto.aboutToStart("pca")).toBeNull();
  });

  test("Run makes the PCA live and starts it at once, through the gate", async () => {
    const page = await livePage();
    expect(page.auto.run("pca")).toBe(true);
    expect(page.pcaRequests()).toHaveLength(1);
    expect(page.pca().kind).toBe("running");
    expect(page.auto.isLive("pca")).toBe(true);
    expect(page.events).toEqual([]);
  });

  test("Run pressed while a run of the arrow keys waits sends the PCA with the value the run holds, through the gate", async () => {
    const page = await livePage();
    const run = createThresholdRun({
      gate: page.gate,
      change: (to) => {
        page.setMissing(to);
      },
      ended: () => undefined,
    });
    run.press(0.1, 0.099);
    expect(page.auto.run("pca")).toBe(true);
    expect(run.waiting()).toBe(false);
    expect(page.pcaRequests()).toHaveLength(1);
    expect(JSON.stringify(page.pcaRequests()[0]?.job)).toContain("0.099");
  });

  test("after Run and its end, a threshold changed starts the PCA one second later, and not before", async () => {
    const page = await liveDone();
    page.setMissing(0.05);
    await wait(999);
    expect(page.pcaRequests()).toHaveLength(1);
    expect(page.pca().kind).toBe("ready");
    await wait(1);
    expect(page.pcaRequests()).toHaveLength(2);
    expect(page.pca().kind).toBe("running");
    expect(page.events).toEqual(["startedByItself pca"]);
  });

  test("a second change within that second puts the start off, and the PCA is calculated for the values when it runs out", async () => {
    const page = await liveDone();
    page.setMissing(0.05);
    await wait(600);
    page.setMissing(0.04);
    await wait(600);
    expect(page.pcaRequests()).toHaveLength(1);
    await wait(400);
    expect(page.pcaRequests()).toHaveLength(2);
    const sent = page.pcaRequests()[1];
    expect(sent?.key).toBe(
      page.pca().kind === "running" ? keyOf(page.pca()) : "",
    );
    expect(JSON.stringify(sent?.job)).toContain("0.04");
  });

  test("ten changes 300 ms apart start one PCA, a second after the last", async () => {
    const page = await liveDone();
    for (let step = 1; step <= 10; step += 1) {
      page.setMissing(0.1 - step * 0.001);
      await wait(300);
    }
    expect(page.pcaRequests()).toHaveLength(1);
    await wait(700);
    expect(page.pcaRequests()).toHaveLength(2);
    expect(JSON.stringify(page.pcaRequests()[1]?.job)).toContain("0.09");
  });

  test("a change under way, a slider held, a list open, digits not confirmed or the dialog of the download open, keeps the PCA from starting for 3 s, and its release starts the second", async () => {
    const page = await liveDone();
    page.setMissing(0.05);
    const release = page.gate.holdChange();
    await wait(3000);
    expect(page.pcaRequests()).toHaveLength(1);
    expect(page.auto.aboutToStart("pca")).toBe("changes");
    release();
    await wait(999);
    expect(page.pcaRequests()).toHaveLength(1);
    await wait(1);
    expect(page.pcaRequests()).toHaveLength(2);
  });

  test("a hold taken before the change and released after it starts the second at the release", async () => {
    const page = await liveDone();
    const release = page.gate.holdChange();
    await wait(2000);
    page.setMissing(0.05);
    await wait(3000);
    expect(page.pcaRequests()).toHaveLength(1);
    release();
    // A second release changes nothing.
    release();
    await wait(1000);
    expect(page.pcaRequests()).toHaveLength(2);
  });

  test("a run of the arrow keys holds the second until its change, which the PCA then reads", async () => {
    const page = await liveDone();
    const run = createThresholdRun({
      gate: page.gate,
      change: (to) => {
        page.setMissing(to);
      },
      ended: () => undefined,
    });
    run.press(0.1, 0.099);
    await wait(500);
    run.press(0.099, 0.098);
    await wait(999);
    expect(page.pcaRequests()).toHaveLength(1);
    // The run became its change a second after its last press, and the
    // PCA starts a second after that.
    await wait(1);
    expect(page.gate.underWay()).toBe(0);
    await wait(999);
    expect(page.pcaRequests()).toHaveLength(1);
    await wait(1);
    expect(page.pcaRequests()).toHaveLength(2);
    expect(JSON.stringify(page.pcaRequests()[1]?.job)).toContain("0.098");
  });

  test("nothing starts while a write of the filtered variants runs; the PCA starts once it ends", async () => {
    const page = await liveDone();
    page.setMissing(0.05);
    void startWriting(page.store, "vcf");
    expect(page.writes).toHaveLength(1);
    await wait(3000);
    expect(page.pcaRequests()).toHaveLength(1);
    expect(page.auto.aboutToStart("pca")).toBe("download");
    const write = page.writes[0];
    write?.end({ kind: "cancelled" });
    page.raw.cancelWrite();
    await flush();
    expect(page.pcaRequests()).toHaveLength(2);
  });

  test("Run is refused while a write of the filtered variants runs: no PCA asked for, and the PCA not made live", async () => {
    const page = await livePage();
    void startWriting(page.store, "vcf");
    expect(page.writes).toHaveLength(1);
    expect(page.auto.run("pca")).toBe(false);
    expect(page.pcaRequests()).toHaveLength(0);
    expect(page.auto.isLive("pca")).toBe(false);
    await wait(5000);
    expect(page.pcaRequests()).toHaveLength(0);
  });

  test("nothing starts while the PCA runs, and the clock passing during its run starts no second one", async () => {
    const page = await livePage();
    page.auto.run("pca");
    await wait(5000);
    expect(page.pcaRequests()).toHaveLength(1);
    await page.endPca();
    await wait(5000);
    expect(page.pcaRequests()).toHaveLength(1);
    expect(page.pca().kind).toBe("done");
  });

  test("a value set back is calculated again, once for each change that reaches the project", async () => {
    const page = await liveDone();
    page.setMissing(0.05);
    await wait(1000);
    await page.endPca();
    page.setMissing(0.1);
    await wait(1000);
    expect(page.pcaRequests()).toHaveLength(3);
    expect(page.pcaRequests()[2]?.key).toBe(page.pcaRequests()[0]?.key);
  });

  test("a value moved and set back within the second is calculated again once, its result not kept", async () => {
    const page = await liveDone();
    page.setMissing(0.05);
    await wait(500);
    page.setMissing(0.1);
    await wait(2000);
    // The store keeps no result for values left behind, so the key of
    // 0.1 again is calculated again.
    expect(page.pcaRequests()).toHaveLength(2);
    expect(page.pcaRequests()[1]?.key).toBe(page.pcaRequests()[0]?.key);
  });

  test("the colour of the points, the view, the individuals file and its column start nothing", async () => {
    const page = await liveDone();
    page.store.apply("the colour of the points changed", (p) =>
      setAnalysisOptions(p, pcaOnPopgen2, {
        ...pcaOptions(p, "popgen2"),
        colourBy: "height",
        view: "2d",
      }),
    );
    page.store.applyAfresh((p) =>
      loadIndividuals(p, {
        fileId: SECOND,
        name: "panel_pops.csv",
        csv: null,
      }),
    );
    page.store.apply("the column of the populations changed", (p) =>
      setGrouping(p, { kind: "populations", column: "popcat" }),
    );
    expect(page.raw.getState().project.grouping).toEqual({
      kind: "populations",
      column: "popcat",
    });
    await wait(3000);
    expect(page.pcaRequests()).toHaveLength(1);
    expect(page.pca().kind).toBe("done");
    expect(page.auto.aboutToStart("pca")).toBeNull();
  });

  test("a Stop during a run ends the live state: the PCA ready, and a change then starts nothing until Run", async () => {
    const page = await liveDone();
    page.setMissing(0.05);
    await wait(1000);
    expect(page.pca().kind).toBe("running");
    page.auto.pause("pca");
    expect(page.pcaRequests()[1]?.cancelled).toBe(true);
    page.pcaRequests()[1]?.end({ kind: "cancelled" });
    await flush();
    expect(page.pca().kind).toBe("ready");
    expect(page.auto.isLive("pca")).toBe(false);
    expect(page.auto.stoppedByUser("pca")).toBe(true);
    page.setMissing(0.04);
    await wait(5000);
    expect(page.pcaRequests()).toHaveLength(2);
    expect(page.events).toEqual(["startedByItself pca", "paused pca"]);

    expect(page.auto.run("pca")).toBe(true);
    expect(page.pcaRequests()).toHaveLength(3);
    expect(page.auto.stoppedByUser("pca")).toBe(false);
  });

  test("a Stop during the second ends the live state before the PCA starts", async () => {
    const page = await liveDone();
    page.setMissing(0.05);
    await wait(500);
    expect(page.auto.aboutToStart("pca")).toBe("changes");
    page.auto.pause("pca");
    expect(page.auto.aboutToStart("pca")).toBeNull();
    await wait(5000);
    expect(page.pcaRequests()).toHaveLength(1);
    expect(page.pca().kind).toBe("ready");
    expect(page.events).toEqual(["paused pca"]);
  });

  test("another variants file ends the live state: for it, the PCA waits for Run", async () => {
    const page = await liveDone();
    openVariantsFile(page.store, panelLoad(SECOND));
    page.raw.variantsRead(SECOND, {
      kind: "read",
      individuals: ["s000", "s001"],
      ploidy: 2,
      numVars: null,
      keepsPassed: false,
    });
    await flush();
    const pass = page.requests.at(-1);
    pass?.end({
      kind: "done",
      key: pass.key,
      result: summaryResult(["1"], [1200]),
    });
    await flush();
    expect(page.pca().kind).toBe("ready");
    expect(page.auto.isLive("pca")).toBe(false);
    expect(page.auto.stoppedByUser("pca")).toBe(false);
    await wait(5000);
    expect(page.pcaRequests()).toHaveLength(1);
  });

  test("the LD distance emptied and typed again with the same value shows the result kept, with no request", async () => {
    const page = await liveDone();
    page.setDistance(null);
    expect(page.pca().kind).toBe("locked");
    expect(page.auto.isLive("pca")).toBe(true);
    expect(page.auto.aboutToStart("pca")).toBeNull();
    await wait(2000);
    page.setDistance(50_000);
    expect(page.pca().kind).toBe("done");
    await wait(5000);
    expect(page.pcaRequests()).toHaveLength(1);
  });

  test("the LD distance emptied and another typed starts the PCA a second after", async () => {
    const page = await liveDone();
    page.setDistance(null);
    await wait(2000);
    page.setDistance(40_000);
    expect(page.auto.aboutToStart("pca")).toBe("changes");
    await wait(1000);
    expect(page.pcaRequests()).toHaveLength(2);
  });

  test("a PCA refused by popnei under a key does not start again under it; a change to another key starts it, the PCA still live", async () => {
    const page = await liveDone();
    page.setMissing(0.05);
    await wait(1000);
    await page.endPca({
      kind: "failed",
      error: { kind: "popnei", message: "no variant left" },
    });
    expect(page.pca().kind).toBe("error");
    await wait(5000);
    expect(page.pcaRequests()).toHaveLength(2);
    expect(page.auto.isLive("pca")).toBe(true);
    page.setMissing(0.06);
    await wait(1000);
    expect(page.pcaRequests()).toHaveLength(3);
  });

  test("a crash of the worker under a key: Run again tries again under the same key, and the PCA stays live", async () => {
    const page = await liveDone();
    page.setMissing(0.05);
    await wait(1000);
    await page.endPca({
      kind: "failed",
      error: { kind: "workerFailed", message: "out of memory" },
    });
    expect(page.pca().kind).toBe("error");
    await wait(5000);
    expect(page.pcaRequests()).toHaveLength(2);
    expect(page.auto.isLive("pca")).toBe(true);
    expect(page.auto.run("pca")).toBe(true);
    expect(page.pcaRequests()).toHaveLength(3);
    expect(page.pcaRequests()[2]?.key).toBe(page.pcaRequests()[1]?.key);
  });

  test.each([
    { kind: "couldNotStart", reason: "no ready" },
    { kind: "protocolMismatch" },
    { kind: "defect", message: "a message that did not validate" },
  ] as const)(
    "a failure only a reload mends, $kind, ends the live state as a Stop does, with no Stop said, and a change then starts nothing",
    async (error) => {
      const page = await liveDone();
      page.setMissing(0.05);
      await wait(1000);
      await page.endPca({ kind: "failed", error });
      expect(page.pca().kind).toBe("error");
      expect(page.auto.isLive("pca")).toBe(false);
      expect(page.auto.liveState("pca")).toEqual({ kind: "stopped" });
      expect(page.events).toEqual(["startedByItself pca"]);
      page.setMissing(0.06);
      await wait(5000);
      expect(page.pcaRequests()).toHaveLength(2);
    },
  );

  test("a crash whose words speak of the memory, 2,264 individuals, ends the live state; Run makes it live again", async () => {
    const individuals = Array.from(
      { length: 2264 },
      (_, i) => `s${String(i).padStart(4, "0")}`,
    );
    const page = await livePage(individuals);
    page.auto.run("pca");
    await page.endPca({
      kind: "failed",
      error: { kind: "workerFailed", message: "out of memory" },
    });
    expect(page.auto.liveState("pca")).toEqual({ kind: "stopped" });
    page.setMissing(0.05);
    await wait(5000);
    expect(page.pcaRequests()).toHaveLength(1);
    expect(page.auto.run("pca")).toBe(true);
    expect(page.auto.isLive("pca")).toBe(true);
  });

  test('aboutToStart: null before Run, while running and done; "changes" during the quiet second and while a hold of a control holds it; null after a Stop', async () => {
    const page = await livePage();
    expect(page.auto.aboutToStart("pca")).toBeNull();
    page.auto.run("pca");
    expect(page.auto.aboutToStart("pca")).toBeNull();
    await page.endPca();
    expect(page.auto.aboutToStart("pca")).toBeNull();
    const release = page.gate.holdChange();
    page.setMissing(0.05);
    expect(page.auto.aboutToStart("pca")).toBe("changes");
    await wait(3000);
    expect(page.auto.aboutToStart("pca")).toBe("changes");
    release();
    await wait(500);
    expect(page.auto.aboutToStart("pca")).toBe("changes");
    await wait(500);
    expect(page.auto.aboutToStart("pca")).toBeNull();
    expect(page.pca().kind).toBe("running");
  });

  test('aboutToStart is "download" while the dialog of the download holds the second, and "changes" again once it closes', async () => {
    const page = await liveDone();
    page.setMissing(0.05);
    const closeDialog = page.gate.holdChange("download");
    expect(page.auto.aboutToStart("pca")).toBe("download");
    const releaseList = page.gate.holdChange();
    expect(page.auto.aboutToStart("pca")).toBe("download");
    releaseList();
    closeDialog();
    expect(page.auto.aboutToStart("pca")).toBe("changes");
    await wait(1000);
    expect(page.auto.aboutToStart("pca")).toBeNull();
    expect(page.pcaRequests()).toHaveLength(2);
  });

  test("liveState: off, live and running, live and done, about to start, stopped; the same object while nothing of it changes", async () => {
    const page = await livePage();
    expect(page.auto.liveState("pca")).toEqual({ kind: "off" });
    page.auto.run("pca");
    expect(page.auto.liveState("pca")).toEqual({
      kind: "live",
      aboutToStart: null,
      running: true,
    });
    await page.endPca();
    const done = page.auto.liveState("pca");
    expect(done).toEqual({ kind: "live", aboutToStart: null, running: false });
    expect(page.auto.liveState("pca")).toBe(done);
    page.setMissing(0.05);
    expect(page.auto.liveState("pca")).toEqual({
      kind: "live",
      aboutToStart: "changes",
      running: false,
    });
    const closeDialog = page.gate.holdChange("download");
    expect(page.auto.liveState("pca")).toEqual({
      kind: "live",
      aboutToStart: "download",
      running: false,
    });
    closeDialog();
    page.auto.pause("pca");
    expect(page.auto.liveState("pca")).toEqual({ kind: "stopped" });
  });

  test("a reader subscribed to autoRuns alone is told of every change of liveState: a change of a filter, a hold of the download, its end, a Run and a new load", async () => {
    const page = await liveDone();
    const seen: unknown[] = [];
    let last = page.auto.liveState("pca");
    let version = page.auto.getVersion();
    page.auto.subscribe(() => {
      const now = page.auto.liveState("pca");
      if (now !== last) seen.push(now);
      last = now;
      expect(page.auto.getVersion()).not.toBe(version);
      version = page.auto.getVersion();
    });
    page.setMissing(0.05);
    expect(seen).toEqual([
      { kind: "live", aboutToStart: "changes", running: false },
    ]);
    const closeDialog = page.gate.holdChange("download");
    closeDialog();
    await wait(1000);
    expect(seen.slice(1)).toEqual([
      { kind: "live", aboutToStart: "download", running: false },
      { kind: "live", aboutToStart: "changes", running: false },
      { kind: "live", aboutToStart: null, running: true },
    ]);
    await page.endPca();
    openVariantsFile(page.store, panelLoad(SECOND));
    expect(seen.slice(4)).toEqual([
      { kind: "live", aboutToStart: null, running: false },
      { kind: "off" },
    ]);
  });

  test("the page is told when the live state changes, at Run and at a Stop, which no change of the store tells", async () => {
    const page = await liveDone();
    const before = page.auto.getVersion();
    let told = 0;
    page.auto.subscribe(() => {
      told += 1;
    });
    page.setMissing(0.05);
    page.auto.pause("pca");
    expect(told).toBeGreaterThan(0);
    expect(page.auto.getVersion()).not.toBe(before);
  });

  test("Stop while the PCA is live and locked ends the live state, and the lock lifted starts nothing", async () => {
    const page = await liveDone();
    page.setDistance(null);
    page.auto.pause("pca");
    expect(page.auto.isLive("pca")).toBe(false);
    page.setDistance(40_000);
    await wait(5000);
    expect(page.pcaRequests()).toHaveLength(1);
  });

  test("the PCA started by itself is said once at its start, and not for a start by Run", async () => {
    const page = await liveDone();
    page.setMissing(0.05);
    await wait(1000);
    await page.endPca();
    page.setMissing(0.04);
    await wait(1000);
    expect(page.events).toEqual(["startedByItself pca", "startedByItself pca"]);
  });

  test("the one pass of the file is not taken for a key the PCA was started under", async () => {
    const page = await liveDone();
    const passKey = page.requests[0]?.key ?? "";
    expect(page.auto.startedUnder(keyFromWire(passKey))).toBe(true);
    const pcaKey = page.pcaRequests()[0]?.key ?? "";
    expect(page.auto.startedUnder(keyFromWire(pcaKey))).toBe(false);
  });
});

/** The key of a status that has one. */
function keyOf(status: AnalysisStatus<JobResult>): string {
  return "key" in status ? status.key : "";
}
