import { describe, expect, test } from "vitest";

import { loadVariants } from "../core/project.ts";
import type { AnalysisStatus, Store } from "../core/store.ts";
import type {
  Job,
  JobResult,
  Outcome,
  Run,
  RunError,
  VariantDistrib,
} from "../worker/protocol.ts";
import { createAutoRuns } from "./autoRuns.ts";
import { createPopgen2Store } from "./popgen2Store.ts";
import { startAnalysis } from "./runs.ts";
import { STATISTICS_IDS, SUMMARY_ID } from "./variants/words.ts";

const ID = SUMMARY_ID;

/** A request the fake `send` was given: its key, its job, whether the
    store cancelled it, and how the test ends it. */
interface Request {
  readonly key: string;
  readonly job: Job;
  cancelled: boolean;
  readonly end: (outcome: Outcome<JobResult>) => void;
}

/** The store of the new page with a fake `send` whose requests the test
    ends by hand, and the analyses it starts by itself, `groups`, the
    summary alone unless given. */
function setUp(groups: readonly (readonly string[])[] = [[ID]]): {
  readonly store: Store<JobResult, Blob>;
  readonly sent: ((outcome: Outcome<JobResult>) => void)[];
  readonly requests: Request[];
  readonly auto: ReturnType<typeof createAutoRuns>;
  readonly status: (id?: string) => AnalysisStatus<JobResult>;
} {
  const sent: ((outcome: Outcome<JobResult>) => void)[] = [];
  const requests: Request[] = [];
  let lastId = 0;
  const store = createPopgen2Store({
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

/** Loads `panel.nei` under `fileId` and records its read. */
function open(store: Store<JobResult, Blob>, fileId: string): void {
  store.apply("a new variants file was loaded", (p) =>
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
const SUMMARY: JobResult = {
  analysis: "variantsSummary",
  passStats: { numVars: 1200, filtering: {} },
  chroms: ["1"],
  numVarsPerChrom: new Uint32Array([1200]),
};

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

  test("a failure is not started again by itself, and Count again starts it", async () => {
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

    auto.again(ID);
    expect(sent).toHaveLength(2);
    expect(status().kind).toBe("running");
  });

  test("a Stop leaves the summary ready under a key it was started under, and Count again starts it", async () => {
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

    auto.again(ID);
    expect(sent).toHaveLength(2);
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

  test("Count again does nothing while the summary is running or done", async () => {
    const { store, auto, sent, status } = setUp();
    open(store, FIRST);
    auto.sync();

    auto.again(ID);
    expect(sent).toHaveLength(1);

    const running = status();
    if (running.kind !== "running") throw new Error("not running");
    sent[0]?.({ kind: "done", key: running.key, result: SUMMARY });
    await settled();
    expect(status().kind).toBe("done");

    auto.again(ID);
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

describe("the statistics of the open file, started after the count, one after the other", () => {
  const PAGE_IDS = [ID, ...STATISTICS_IDS];
  const PAGE_GROUPS = [[ID], STATISTICS_IDS];

  /** The page with a file open and its count done, and the statistics
      of each individual running, the second request. */
  async function countDone(): Promise<ReturnType<typeof setUp>> {
    const page = setUp(PAGE_GROUPS);
    open(page.store, FIRST);
    page.auto.sync();
    endDone(page.requests[0]);
    await settled();
    page.auto.sync();
    return page;
  }

  test("the count starts alone; once done, the statistics of each individual; once they are done, the histograms of the variants", async () => {
    const { store, requests, auto, status } = setUp(PAGE_GROUPS);
    open(store, FIRST);
    auto.sync();
    expect(analysesOf(requests)).toEqual([ID]);
    expect(status("individualChecks").kind).toBe("ready");

    endDone(requests[0]);
    await settled();
    auto.sync();
    expect(analysesOf(requests)).toEqual([ID, "individualChecks"]);
    expect(status("variantChecks").kind).toBe("ready");

    endDone(requests[1]);
    await settled();
    auto.sync();
    expect(analysesOf(requests)).toEqual([
      ID,
      "individualChecks",
      "variantChecks",
    ]);
    expect(requests[2]?.job).toMatchObject({
      analysis: "variantChecks",
      individuals: null,
    });

    endDone(requests[2]);
    await settled();
    auto.sync();
    expect(requests).toHaveLength(3);
    expect(PAGE_IDS.map((id) => status(id).kind)).toEqual([
      "done",
      "done",
      "done",
    ]);
  });

  test("the count's Stop leaves the statistics not started, and Count again starts the count and then them", async () => {
    const { store, requests, auto, status } = setUp(PAGE_GROUPS);
    open(store, FIRST);
    auto.sync();
    store.cancelRun(ID);
    requests[0]?.end({ kind: "cancelled" });
    await settled();
    auto.sync();
    expect(requests).toHaveLength(1);
    const individuals = status("individualChecks");
    expect(individuals.kind).toBe("ready");
    if (individuals.kind !== "ready") return;
    expect(auto.startedUnder(individuals.key)).toBe(false);

    auto.again(ID);
    expect(analysesOf(requests)).toEqual([ID, ID]);
    endDone(requests[1]);
    await settled();
    auto.sync();
    expect(analysesOf(requests)).toEqual([ID, ID, "individualChecks"]);
  });

  test("stop of the statistics while those of each individual run cancels them, and the histograms of the variants do not start", async () => {
    const { store, requests, auto, status } = setUp(PAGE_GROUPS);
    open(store, FIRST);
    auto.sync();
    endDone(requests[0]);
    await settled();
    auto.sync();

    auto.stop(STATISTICS_IDS);
    expect(requests[1]?.cancelled).toBe(true);
    requests[1]?.end({ kind: "cancelled" });
    await settled();
    auto.sync();

    expect(requests).toHaveLength(2);
    expect(status(ID).kind).toBe("done");
    const stopped = status("individualChecks");
    expect(stopped.kind).toBe("ready");
    if (stopped.kind !== "ready") return;
    expect(auto.startedUnder(stopped.key)).toBe(true);
    expect(status("variantChecks").kind).toBe("ready");
  });

  test("resume after a stop of the statistics of each individual starts them again, and the histograms of the variants after them", async () => {
    const { store, requests, auto } = setUp(PAGE_GROUPS);
    open(store, FIRST);
    auto.sync();
    endDone(requests[0]);
    await settled();
    auto.sync();
    auto.stop(STATISTICS_IDS);
    requests[1]?.end({ kind: "cancelled" });
    await settled();

    expect(auto.resume(STATISTICS_IDS)).toBe(true);
    expect(analysesOf(requests)).toEqual([
      ID,
      "individualChecks",
      "individualChecks",
    ]);
    endDone(requests[2]);
    await settled();
    auto.sync();
    expect(analysesOf(requests).at(-1)).toBe("variantChecks");
    expect(requests).toHaveLength(4);
  });

  test("stop while the histograms of the variants run cancels them alone, and resume starts them, not the statistics of each individual, which are done", async () => {
    const { store, requests, auto, status } = setUp(PAGE_GROUPS);
    open(store, FIRST);
    auto.sync();
    endDone(requests[0]);
    await settled();
    auto.sync();
    endDone(requests[1]);
    await settled();
    auto.sync();

    auto.stop(STATISTICS_IDS);
    expect(requests.map((request) => request.cancelled)).toEqual([
      false,
      false,
      true,
    ]);
    requests[2]?.end({ kind: "cancelled" });
    await settled();
    auto.sync();
    expect(requests).toHaveLength(3);
    expect(status("individualChecks").kind).toBe("done");
    expect(status("variantChecks").kind).toBe("ready");

    expect(auto.resume(STATISTICS_IDS)).toBe(true);
    expect(analysesOf(requests)).toEqual([
      ID,
      "individualChecks",
      "variantChecks",
      "variantChecks",
    ]);
  });

  test("resume does nothing while one of the statistics runs, nor once both are done", async () => {
    const { store, requests, auto } = setUp(PAGE_GROUPS);
    open(store, FIRST);
    auto.sync();
    endDone(requests[0]);
    await settled();
    auto.sync();

    expect(auto.resume(STATISTICS_IDS)).toBe(false);
    expect(requests).toHaveLength(2);

    endDone(requests[1]);
    await settled();
    auto.sync();
    endDone(requests[2]);
    await settled();
    auto.sync();
    expect(auto.resume(STATISTICS_IDS)).toBe(false);
    expect(requests).toHaveLength(3);
  });

  test("stop does nothing when none of the statistics runs: the count goes on", () => {
    const { store, requests, auto, status } = setUp(PAGE_GROUPS);
    open(store, FIRST);
    auto.sync();

    auto.stop(STATISTICS_IDS);
    expect(requests[0]?.cancelled).toBe(false);
    expect(status(ID).kind).toBe("running");
  });

  test("a crash of the statistics of each individual does not hold back the histograms of the variants, and resume then starts the statistics again", async () => {
    const { requests, auto, status } = await countDone();
    fail(requests[1], { kind: "workerFailed", message: "out of memory" });
    await settled();
    auto.sync();
    expect(status("individualChecks").kind).toBe("error");
    expect(analysesOf(requests)).toEqual([
      ID,
      "individualChecks",
      "variantChecks",
    ]);

    expect(auto.resume(STATISTICS_IDS)).toBe(false);
    endDone(requests[2]);
    await settled();
    auto.sync();
    expect(requests).toHaveLength(3);

    expect(auto.resume(STATISTICS_IDS)).toBe(true);
    expect(analysesOf(requests).at(-1)).toBe("individualChecks");
  });

  test("a defect of ours in the statistics of each individual does not hold back the histograms of the variants", async () => {
    const { requests, auto } = await countDone();
    fail(requests[1], {
      kind: "defect",
      message: "a message that did not validate",
    });
    await settled();
    auto.sync();
    expect(analysesOf(requests).at(-1)).toBe("variantChecks");
  });

  test("popnei's refusal of the statistics of each individual holds back the histograms of the variants, and resume starts nothing", async () => {
    const { requests, auto, status } = await countDone();
    fail(requests[1], { kind: "popnei", message: "not a VCF" });
    await settled();
    auto.sync();
    expect(status("individualChecks").kind).toBe("error");
    expect(requests).toHaveLength(2);
    expect(auto.pending("variantChecks")).toEqual({
      kind: "blocked",
      by: "individualChecks",
    });

    expect(auto.resume(STATISTICS_IDS)).toBe(false);
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
    expect(status("individualChecks").kind).toBe("error");
    expect(status("variantChecks").kind).toBe("error");
    expect(requests).toHaveLength(2);
    expect(auto.pending("variantChecks")).toBeNull();

    expect(auto.resume(STATISTICS_IDS)).toBe(false);
    expect(requests).toHaveLength(2);
  });

  test("a crash of the count holds back the statistics, which wait for the count", async () => {
    const { store, requests, auto } = setUp(PAGE_GROUPS);
    open(store, FIRST);
    auto.sync();
    fail(requests[0], { kind: "workerFailed", message: "out of memory" });
    await settled();
    auto.sync();
    expect(requests).toHaveLength(1);
    expect(auto.pending("individualChecks")).toEqual({
      kind: "blocked",
      by: ID,
    });
    expect(auto.resume(STATISTICS_IDS)).toBe(false);
    expect(requests).toHaveLength(1);
  });

  test("resume of the statistics while the count is stopped starts nothing", async () => {
    const { store, requests, auto, status } = setUp(PAGE_GROUPS);
    open(store, FIRST);
    auto.sync();
    store.cancelRun(ID);
    requests[0]?.end({ kind: "cancelled" });
    await settled();
    auto.sync();
    expect(auto.pending("individualChecks")).toEqual({
      kind: "waiting",
      after: ID,
    });

    expect(auto.resume(STATISTICS_IDS)).toBe(false);
    expect(requests).toHaveLength(1);
    expect(PAGE_IDS.map((id) => status(id).kind)).toEqual([
      "ready",
      "ready",
      "ready",
    ]);
  });

  test("pending tells an analysis waiting for the one before from one stopped", async () => {
    const { requests, auto } = await countDone();
    expect(auto.pending("individualChecks")).toBeNull();
    expect(auto.pending("variantChecks")).toEqual({
      kind: "waiting",
      after: "individualChecks",
    });

    auto.stop(STATISTICS_IDS);
    requests[1]?.end({ kind: "cancelled" });
    await settled();
    auto.sync();
    expect(auto.pending("individualChecks")).toEqual({ kind: "stopped" });
    expect(auto.pending("variantChecks")).toEqual({
      kind: "waiting",
      after: "individualChecks",
    });
  });

  test("after a crash of the statistics of each individual and a stop of the histograms of the variants, resume starts both, one after the other", async () => {
    const { requests, auto, status } = await countDone();
    fail(requests[1], { kind: "workerFailed", message: "out of memory" });
    await settled();
    auto.sync();
    auto.stop(STATISTICS_IDS);
    requests[2]?.end({ kind: "cancelled" });
    await settled();
    auto.sync();
    expect(auto.pending("variantChecks")).toEqual({ kind: "stopped" });

    expect(auto.resume(STATISTICS_IDS)).toBe(true);
    expect(analysesOf(requests).at(-1)).toBe("individualChecks");
    expect(auto.pending("variantChecks")).toEqual({
      kind: "waiting",
      after: "individualChecks",
    });
    const variants = status("variantChecks");
    if (variants.kind !== "ready") throw new Error("not ready");
    expect(auto.startedUnder(variants.key)).toBe(false);

    endDone(requests[3]);
    await settled();
    auto.sync();
    expect(analysesOf(requests)).toEqual([
      ID,
      "individualChecks",
      "variantChecks",
      "individualChecks",
      "variantChecks",
    ]);
  });

  test("a stop after resume keeps the rest of the group from starting", async () => {
    const { requests, auto } = await countDone();
    fail(requests[1], { kind: "workerFailed", message: "out of memory" });
    await settled();
    auto.sync();
    auto.stop(STATISTICS_IDS);
    requests[2]?.end({ kind: "cancelled" });
    await settled();
    auto.sync();
    auto.resume(STATISTICS_IDS);

    auto.stop(STATISTICS_IDS);
    requests[3]?.end({ kind: "cancelled" });
    await settled();
    auto.sync();
    expect(requests).toHaveLength(4);
    expect(auto.pending("variantChecks")).toEqual({ kind: "stopped" });
  });

  test("stop and resume of a list that is not a group is a defect", () => {
    const { auto } = setUp(PAGE_GROUPS);
    expect(() => {
      auto.stop(["variantChecks"]);
    }).toThrow(/popnei_web defect/);
    expect(() => auto.resume([ID, "individualChecks"])).toThrow(
      /popnei_web defect/,
    );
  });

  test("a new file while the statistics run stops them, and starts the count of the new file alone", async () => {
    const { store, requests, auto } = setUp(PAGE_GROUPS);
    open(store, FIRST);
    auto.sync();
    endDone(requests[0]);
    await settled();
    auto.sync();

    open(store, SECOND);
    expect(requests[1]?.cancelled).toBe(true);
    requests[1]?.end({ kind: "cancelled" });
    await settled();
    auto.sync();
    expect(analysesOf(requests)).toEqual([ID, "individualChecks", ID]);
  });
});
