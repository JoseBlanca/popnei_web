import { describe, expect, test } from "vitest";

import { filterFailures } from "../core/analyses/filterFailures.ts";
import { individualChecks } from "../core/analyses/individualChecks.ts";
import { variantChecks } from "../core/analyses/variantChecks.ts";
import { variantsSummary } from "../core/analyses/variantsSummary.ts";
import { countsOf, firstProject } from "../core/apps.ts";
import { loadVariants } from "../core/project.ts";
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
} from "../worker/protocol.ts";
import { createAutoRuns } from "./autoRuns.ts";
import { POPGEN2_AUTO_GROUPS, POPGEN2_CHAIN } from "./popgen2Store.ts";
import { startAnalysis } from "./runs.ts";
import { SUMMARY_ID } from "./variants/words.ts";

const ID = SUMMARY_ID;

/** A request the fake `send` was given: its key, its job, whether the
    store cancelled it, and how the test ends it. */
interface Request {
  readonly key: string;
  readonly job: Job;
  cancelled: boolean;
  readonly end: (outcome: Outcome<JobResult>) => void;
}

/** The analyses a test may start by itself, by their ids: the summary of
    popgen2.html and its count of the FILTER failures, and two analyses of the old page that make a second
    group after it, as the statistics of the open file were before the one
    pass (docs/plans/file-stats.md). */
const DEFS: ReadonlyMap<string, AnalysisDef<Job, JobResult>> = new Map([
  [variantsSummary.id, variantsSummary],
  [filterFailures.id, filterFailures],
  [variantChecks.id, variantChecks],
  [individualChecks.id, individualChecks],
]);

/** A store as that of the new page, with the analyses of `groups` and a
    fake `send` whose requests the test ends by hand, and the analyses it
    starts by itself, `groups`, the page's unless given. */
function setUp(groups: readonly (readonly string[])[] = POPGEN2_AUTO_GROUPS): {
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
    "filterFailures",
    {
      analysis: "filterFailures",
      passStats: {
        numVars: 900,
        filtering: { passed: { varsProcessed: 1200, varsKept: 900 } },
      },
    },
  ],
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

describe("one group of two, the summary and an analysis after it, as the chain of popgen2.html once it counts the FILTER failures", () => {
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

describe("live-stats 3 the chain of popgen2.html: the summary, then the count of the FILTER failures", () => {
  const FAILURES = filterFailures.id;

  test("the page's one group is the summary and then the count of the FILTER failures", () => {
    expect(POPGEN2_CHAIN).toEqual([ID, FAILURES]);
    expect(POPGEN2_AUTO_GROUPS).toEqual([POPGEN2_CHAIN]);
  });

  test("on a VCF the count starts once the summary is done, and nothing more after it", async () => {
    const { store, requests, auto, status } = setUp();
    open(store, FIRST, "vcf");
    auto.sync();
    expect(analysesOf(requests)).toEqual([ID]);
    expect(status(FAILURES).kind).toBe("ready");

    endDone(requests[0]);
    await settled();
    auto.sync();
    expect(analysesOf(requests)).toEqual([ID, FAILURES]);
    expect(requests[1]?.job).toEqual({
      analysis: FAILURES,
      fileId: FIRST,
      filters: [],
    });

    endDone(requests[1]);
    await settled();
    auto.sync();
    expect(requests).toHaveLength(2);
    expect(status(FAILURES).kind).toBe("done");
    expect(auto.resume(POPGEN2_CHAIN)).toBe(false);
  });

  test("a Stop while the count runs leaves it ready under a key it was started under, the summary done; Start again starts the count alone", async () => {
    const { store, requests, auto, status } = setUp();
    open(store, FIRST, "vcf");
    auto.sync();
    endDone(requests[0]);
    await settled();
    auto.sync();

    auto.stop(POPGEN2_CHAIN);
    expect(requests[1]?.cancelled).toBe(true);
    requests[1]?.end({ kind: "cancelled" });
    await settled();
    auto.sync();
    expect(requests).toHaveLength(2);
    expect(status(ID).kind).toBe("done");
    const stopped = status(FAILURES);
    expect(stopped.kind === "ready" && auto.startedUnder(stopped.key)).toBe(
      true,
    );

    expect(auto.resume(POPGEN2_CHAIN)).toBe(true);
    expect(analysesOf(requests)).toEqual([ID, FAILURES, FAILURES]);
    endDone(requests[2]);
    await settled();
    auto.sync();
    expect(status(FAILURES).kind).toBe("done");
  });

  test("a Stop between the end of the summary and the start of the count keeps the count from starting, and Start again starts it", async () => {
    const { store, requests, auto, status } = setUp();
    open(store, FIRST, "vcf");
    auto.sync();
    endDone(requests[0]);
    await settled();
    // The page has not synced yet: the count is about to start.
    auto.stop(POPGEN2_CHAIN);
    auto.sync();
    expect(requests).toHaveLength(1);
    const stopped = status(FAILURES);
    expect(stopped.kind === "ready" && auto.startedUnder(stopped.key)).toBe(
      true,
    );
    expect(auto.resume(POPGEN2_CHAIN)).toBe(true);
    expect(analysesOf(requests)).toEqual([ID, FAILURES]);
  });

  test("on a .nei file the count is locked: the summary done ends the chain, nothing else is sent, and Start again is not offered for it", async () => {
    const { store, requests, auto, status } = setUp();
    open(store, FIRST, "nei");
    expect(status(FAILURES).kind).toBe("locked");
    auto.sync();
    endDone(requests[0]);
    await settled();
    auto.sync();
    auto.sync();
    expect(analysesOf(requests)).toEqual([ID]);
    expect(status(ID).kind).toBe("done");
    expect(status(FAILURES).kind).toBe("locked");
    expect(auto.resume(POPGEN2_CHAIN)).toBe(false);
    auto.stop(POPGEN2_CHAIN);
    expect(auto.resume(POPGEN2_CHAIN)).toBe(false);
    expect(requests).toHaveLength(1);
  });

  test("popnei's refusal of the summary holds the count back, and Start again starts nothing", async () => {
    const { store, requests, auto, status } = setUp();
    open(store, FIRST, "vcf");
    auto.sync();
    fail(requests[0], { kind: "popnei", message: "not a VCF" });
    await settled();
    auto.sync();
    expect(requests).toHaveLength(1);
    expect(status(FAILURES).kind).toBe("ready");
    expect(auto.resume(POPGEN2_CHAIN)).toBe(false);
  });
});

describe("live-stats 3 a locked member of a group starts nothing and holds back nothing", () => {
  const FAILURES = filterFailures.id;
  /** A group whose middle member, the count of the FILTER failures, is
      locked on a `.nei` file. */
  const GROUP = [ID, FAILURES, "variantChecks"];

  test("the summary done, the count locked, the one after it starts by itself", async () => {
    const { store, requests, auto, status } = setUp([GROUP]);
    open(store, FIRST, "nei");
    auto.sync();
    endDone(requests[0]);
    await settled();
    auto.sync();
    expect(status(FAILURES).kind).toBe("locked");
    expect(analysesOf(requests)).toEqual([ID, "variantChecks"]);
  });

  test("a Stop of the one after it, and resume starts that one, passing over the locked count", async () => {
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
