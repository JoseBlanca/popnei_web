import { describe, expect, test, vi } from "vitest";

import { POPGEN_ANALYSES, countsOf, firstProject } from "../core/apps.ts";
import { CACHE_MAX_BYTES } from "../core/cache.ts";
import { MAX_UNDO_STEPS } from "../core/history.ts";
import type { Project } from "../core/project.ts";
import { createStore } from "../core/store.ts";
import type { Store } from "../core/store.ts";
import {
  FAKE_STATISTICS,
  fakeAnalyses,
  fakeSend,
  fakeWriteCountsOf,
  fiveIndividualsProject,
  fiveStats,
  writeTestCountsOf,
  writtenFile,
} from "../core/testSupport.ts";
import type { SentRequest, TestResult } from "../core/testSupport.ts";
import type {
  Job,
  JobResult,
  Outcome,
  Run,
  Written,
} from "../worker/protocol.ts";
import { startAnalysis, startWriting, startedAt } from "./runs.ts";

/** A project whose diversity is ready: a `.nei` file read with four
    individuals, and a CSV that puts them in two populations. */
const READY: Project = {
  ...firstProject("popgen"),
  variants: {
    fileId: "0123456789abcdef0123456789abcdef",
    name: "panel.nei",
    size: 261_490,
    format: "nei",
    readOptions: null,
    read: {
      kind: "read",
      individuals: ["i1", "i2", "i3", "i4"],
      ploidy: 2,
      numVars: null,
      keepsPassed: false,
    },
  },
  individuals: {
    fileId: "00000000000000000000000000000001",
    name: "pops.csv",
    csv: { encoding: "auto", separator: "auto", decimal: "auto" },
    typesSet: [],
    read: {
      kind: "read",
      table: {
        columns: ["name", "pop"],
        rows: [
          ["i1", "A"],
          ["i2", "A"],
          ["i3", "B"],
          ["i4", "B"],
        ],
      },
      columns: [{ kind: "identifier" }, { kind: "categorical" }],
      found: {
        encoding: "utf-8",
        separator: ",",
        decimal: ".",
        undecodedLine: null,
      },
    },
  },
  grouping: { kind: "populations", column: "pop" },
};

/** The store of core with a fake `send` whose requests the test ends by
    hand, and the `runEnded` calls it was given. */
function setUp(project: Project | null): {
  readonly store: Store<JobResult>;
  readonly ends: ((outcome: Outcome<JobResult>) => void)[];
  readonly ended: [number, Outcome<JobResult | Written<never>>][];
} {
  const ends: ((outcome: Outcome<JobResult>) => void)[] = [];
  let lastId = 40;
  const real = createStore<Job, JobResult>({
    first: firstProject("popgen"),
    analyses: POPGEN_ANALYSES,
    send: (): Run<JobResult> => {
      lastId += 1;
      const outcome = new Promise<Outcome<JobResult>>((resolve) => {
        ends.push(resolve);
      });
      return { id: lastId, outcome, cancel: () => undefined };
    },
    countsOf,
    counts: null,
    statistics: null,
    write: null,
    appVersion: "0.1.0",
    cacheMaxBytes: CACHE_MAX_BYTES,
    maxUndoSteps: MAX_UNDO_STEPS,
  });
  real.popneiReady("0.1.0");
  if (project !== null) {
    real.open(project);
  }
  const ended: [number, Outcome<JobResult | Written<never>>][] = [];
  const store: Store<JobResult> = {
    ...real,
    runEnded: (runId, outcome) => {
      ended.push([runId, outcome]);
      return real.runEnded(runId, outcome);
    },
  };
  return { store, ends, ended };
}

describe("WS7 D1 startAnalysis", () => {
  test("gives null when the store starts no calculation", () => {
    const { store, ends } = setUp(null);

    expect(startAnalysis(store, "diversity")).toBeNull();
    expect(ends).toHaveLength(0);
  });

  test("gives the outcome to runEnded with the id of its request", async () => {
    const { store, ends, ended } = setUp(READY);

    const started = startAnalysis(store, "diversity");
    expect(started).not.toBeNull();
    expect(ended).toEqual([]);
    ends[0]?.({ kind: "cancelled" });
    await started;

    expect(ended).toEqual([[41, { kind: "cancelled" }]]);
  });

  test("startedAt of the request is the time of its start while it is in flight, and null after", async () => {
    const { store, ends } = setUp(READY);
    expect(startedAt(41)).toBeNull();

    const before = performance.now();
    const started = startAnalysis(store, "diversity");
    const after = performance.now();
    // The time of the start, from the same clock, and not any number.
    const at = startedAt(41);
    expect(at).not.toBeNull();
    expect(at).toBeGreaterThanOrEqual(before);
    expect(at).toBeLessThanOrEqual(after);
    ends[0]?.({ kind: "cancelled" });
    await started;

    expect(startedAt(41)).toBeNull();
  });

  test("a runEnded that throws rejects the promise", async () => {
    const { store, ends } = setUp(READY);
    const throwing: Store<JobResult> = {
      ...store,
      runEnded: () => {
        throw new Error("popnei_web defect: a runEnded that throws");
      },
    };

    const started = startAnalysis(throwing, "diversity");
    ends[0]?.({ kind: "cancelled" });

    await expect(started).rejects.toThrow(
      "popnei_web defect: a runEnded that throws",
    );
  });
});

/** A store of core with the fakes of its tests, the statistics of each
    individual among them, and the five individuals of the worked case
    opened with a threshold of 0.2 on their missing genotypes, which no
    statistics are known for yet; and the ids of the requests its
    `runEnded` was given, in order. */
function setUpWithThreshold(): {
  readonly store: Store<TestResult>;
  readonly sent: SentRequest[];
  readonly ended: number[];
} {
  const { analyses, stats } = fakeAnalyses();
  const { send, sent } = fakeSend();
  const real = createStore({
    first: firstProject("popgen"),
    analyses: [...analyses, stats],
    send,
    countsOf: () => ({ numVarsRead: null, counts: null }),
    counts: null,
    statistics: FAKE_STATISTICS,
    write: null,
    appVersion: "0.1.0",
    cacheMaxBytes: CACHE_MAX_BYTES,
    maxUndoSteps: MAX_UNDO_STEPS,
  });
  real.popneiReady("0.1.0");
  real.open(
    fiveIndividualsProject([
      { kind: "missing_data", maxAllowedMissingRate: 0.2 },
    ]),
  );
  const ended: number[] = [];
  const store: Store<TestResult> = {
    ...real,
    runEnded: (runId, outcome) => {
      ended.push(runId);
      return real.runEnded(runId, outcome);
    },
  };
  return { store, sent, ended };
}

/** The request `index` the fake `send` was given, or a defect. */
function sentAt(sent: readonly SentRequest[], index: number): SentRequest {
  const request = sent[index];
  if (request === undefined) {
    throw new Error(`popnei_web defect: no request ${String(index)} sent`);
  }
  return request;
}

/** Whether `promise` has settled once the callbacks already due have
    run. */
async function settled(promise: Promise<void> | null): Promise<boolean> {
  let done = false;
  void promise?.then(() => {
    done = true;
  });
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
  return done;
}

describe("VS3 D4 startAnalysis of stage 3", () => {
  test("a Run that waits for the statistics gives their handle; their outcome gives the analysis's own handle, awaited and given to runEnded too, and the promise settles after it", async () => {
    const { store, sent, ended } = setUpWithThreshold();

    const started = startAnalysis(store, "pops");
    expect(sent).toHaveLength(1);
    const stats = sentAt(sent, 0);
    expect(stats.job.analysis).toBe("stats");
    stats.end({ kind: "done", key: stats.key, result: fiveStats() });

    expect(await settled(started)).toBe(false);
    expect(ended).toStrictEqual([stats.run.id]);
    const own = sentAt(sent, 1);
    expect(own.job.analysis).toBe("pops");
    own.end({ kind: "cancelled" });
    await started;

    expect(ended).toStrictEqual([stats.run.id, own.run.id]);
  });

  test("a Run that waits for statistics already in flight gets no handle and settles at once, while its request, sent when they end, is awaited by the Calculate that started them", async () => {
    const { store, sent, ended } = setUpWithThreshold();
    const calculate = startAnalysis(store, "stats");
    const stats = sentAt(sent, 0);

    const run = startAnalysis(store, "pops");

    expect(run).not.toBeNull();
    expect(await settled(run)).toBe(true);
    expect(sent).toHaveLength(1);
    stats.end({ kind: "done", key: stats.key, result: fiveStats() });
    expect(await settled(calculate)).toBe(false);
    const own = sentAt(sent, 1);
    expect(own.job.analysis).toBe("pops");
    own.end({ kind: "cancelled" });
    await calculate;

    expect(ended).toStrictEqual([stats.run.id, own.run.id]);
  });

  test("startedAt gives the time of the statistics while the Run waits, and that of its own request once it is sent", async () => {
    const { store, sent } = setUpWithThreshold();

    const started = startAnalysis(store, "pops");
    const stats = sentAt(sent, 0);
    expect(startedAt(stats.run.id)).not.toBeNull();
    stats.end({ kind: "done", key: stats.key, result: fiveStats() });
    await settled(started);

    const own = sentAt(sent, 1);
    expect(startedAt(stats.run.id)).toBeNull();
    const at = startedAt(own.run.id);
    expect(at).not.toBeNull();
    expect(at).toBeLessThanOrEqual(performance.now());
    own.end({ kind: "cancelled" });
    await started;

    expect(startedAt(own.run.id)).toBeNull();
  });
});

describe("VS3 D4 the defects of runEnded", () => {
  test("a runEnded that throws for a handle another runEnded gave back rejects the promise", async () => {
    const { store, sent } = setUpWithThreshold();
    const throwing: Store<TestResult> = {
      ...store,
      runEnded: (runId, outcome) => {
        if (runId !== sentAt(sent, 0).run.id) {
          throw new Error("popnei_web defect: a runEnded that throws");
        }
        return store.runEnded(runId, outcome);
      },
    };

    const started = startAnalysis(throwing, "pops");
    const stats = sentAt(sent, 0);
    stats.end({ kind: "done", key: stats.key, result: fiveStats() });
    // The callbacks already due run, and the store sends the analysis's
    // own request.
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    sentAt(sent, 1).end({ kind: "cancelled" });

    await expect(started).rejects.toThrow(
      "popnei_web defect: a runEnded that throws",
    );
  });

  test("two runEnded that throw for the handles of one press: the first rejects the promise, and the second is thrown on its own, out of the promise", async () => {
    const { store } = setUpWithThreshold();
    const ends: ((outcome: Outcome<TestResult>) => void)[] = [];
    const handle = (id: number): Run<TestResult> => ({
      id,
      outcome: new Promise((resolve) => {
        ends.push(resolve);
      }),
      cancel: () => undefined,
    });
    const twoHandles: Store<TestResult> = {
      ...store,
      startRun: () => [handle(1), handle(2)],
      runEnded: (runId) => {
        throw new Error(`popnei_web defect: runEnded of ${String(runId)}`);
      },
    };
    const queued: (() => void)[] = [];
    const queue = vi
      .spyOn(globalThis, "queueMicrotask")
      .mockImplementation((callback) => {
        queued.push(callback);
      });

    try {
      const started = startAnalysis(twoHandles, "pops");
      ends[0]?.({ kind: "cancelled" });
      ends[1]?.({ kind: "cancelled" });

      await expect(started).rejects.toThrow("popnei_web defect: runEnded of 1");
      expect(queued).toHaveLength(1);
      expect(queued[0]).toThrow("popnei_web defect: runEnded of 2");
    } finally {
      queue.mockRestore();
    }
  });
});

/** The store of the fake analyses with a write, and the five individuals
    opened with the threshold of 0.2, whose `runEnded` throws for the
    handles `throwsFor` names. */
function setUpWriting(throwsFor: (runId: number) => boolean): {
  readonly store: Store<TestResult, string>;
  readonly sent: readonly SentRequest[];
  readonly writes: ReturnType<typeof fakeSend>["writes"];
} {
  const { analyses, stats, counts } = fakeAnalyses();
  const { send, sent, writeSend, writes } = fakeSend();
  const real = createStore({
    first: firstProject("popgen"),
    analyses: [...analyses, stats, counts],
    send,
    countsOf: writeTestCountsOf,
    counts: "counts",
    statistics: FAKE_STATISTICS,
    write: { send: writeSend, countsOf: fakeWriteCountsOf },
    appVersion: "0.1.0",
    cacheMaxBytes: CACHE_MAX_BYTES,
    maxUndoSteps: MAX_UNDO_STEPS,
  });
  real.popneiReady("0.1.0");
  real.open(
    fiveIndividualsProject([
      { kind: "missing_data", maxAllowedMissingRate: 0.2 },
    ]),
  );
  const store: Store<TestResult, string> = {
    ...real,
    runEnded: (runId, outcome) => {
      if (throwsFor(runId)) {
        throw new Error(`popnei_web defect: runEnded of ${String(runId)}`);
      }
      return real.runEnded(runId, outcome);
    },
  };
  return { store, sent, writes };
}

describe("VS3 D6 startWriting", () => {
  test("a runEnded that throws for the write's own handle, which the statistics' runEnded gave back, rejects the promise", async () => {
    const env = setUpWriting((runId) => runId === env.writes[0]?.run.id);

    const started = startWriting(env.store, "nei");
    const statsRequest = sentAt(env.sent, 0);
    statsRequest.end({
      kind: "done",
      key: statsRequest.key,
      result: fiveStats(),
    });
    // The callbacks already due run, and the store sends the write.
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    const write = env.writes[0];
    expect(write).toBeDefined();
    write?.end({ kind: "cancelled" });

    await expect(started).rejects.toThrow(
      `popnei_web defect: runEnded of ${String(write?.run.id)}`,
    );
  });

  test("two runEnded that throw for the handles of one write: the first rejects the promise, and the second is thrown on its own, out of the promise", async () => {
    const { store } = setUpWriting(() => true);
    const ends: ((outcome: Outcome<TestResult | Written<string>>) => void)[] =
      [];
    const handle = (id: number): Run<TestResult | Written<string>> => ({
      id,
      outcome: new Promise((resolve) => {
        ends.push(resolve);
      }),
      cancel: () => undefined,
    });
    const twoHandles: Store<TestResult, string> = {
      ...store,
      startWrite: () => [handle(1), handle(2)],
    };
    const queued: (() => void)[] = [];
    const queue = vi
      .spyOn(globalThis, "queueMicrotask")
      .mockImplementation((callback) => {
        queued.push(callback);
      });

    try {
      const started = startWriting(twoHandles, "nei");
      ends[0]?.({ kind: "cancelled" });
      ends[1]?.({ kind: "cancelled" });

      await expect(started).rejects.toThrow("popnei_web defect: runEnded of 1");
      expect(queued).toHaveLength(1);
      expect(queued[0]).toThrow("popnei_web defect: runEnded of 2");
    } finally {
      queue.mockRestore();
    }
  });

  test("a write that waits for the statistics gives their handle; their outcome gives the write's own handle, awaited and given to runEnded too, and the promise settles after it; null when the store starts none", async () => {
    const { analyses, stats, counts } = fakeAnalyses();
    const { send, sent, writeSend, writes } = fakeSend();
    const real = createStore({
      first: firstProject("popgen"),
      analyses: [...analyses, stats, counts],
      send,
      countsOf: writeTestCountsOf,
      counts: "counts",
      statistics: FAKE_STATISTICS,
      write: { send: writeSend, countsOf: fakeWriteCountsOf },
      appVersion: "0.1.0",
      cacheMaxBytes: CACHE_MAX_BYTES,
      maxUndoSteps: MAX_UNDO_STEPS,
    });
    real.popneiReady("0.1.0");
    real.open(
      fiveIndividualsProject([
        { kind: "missing_data", maxAllowedMissingRate: 0.2 },
      ]),
    );
    const ended: number[] = [];
    const store: Store<TestResult, string> = {
      ...real,
      runEnded: (runId, outcome) => {
        ended.push(runId);
        return real.runEnded(runId, outcome);
      },
    };

    const started = startWriting(store, "nei");
    expect(sent).toHaveLength(1);
    const statsRequest = sentAt(sent, 0);
    expect(statsRequest.job.analysis).toBe("stats");
    statsRequest.end({
      kind: "done",
      key: statsRequest.key,
      result: fiveStats(),
    });

    expect(await settled(started)).toBe(false);
    expect(ended).toStrictEqual([statsRequest.run.id]);
    const write = writes[0];
    expect(write?.job.individuals).toStrictEqual(["a", "b", "d"]);
    expect(startedAt(write?.run.id ?? 0)).not.toBeNull();
    expect(startWriting(store, "nei")).toBeNull();
    write?.end({
      kind: "done",
      key: write.key,
      result: writtenFile(1150, 1200),
    });
    await started;

    expect(ended).toStrictEqual([statsRequest.run.id, write?.run.id]);
    expect(store.getState().write?.kind).toBe("done");
  });

  test("IP10 D3 a write that waits for statistics already in flight gets no handle and settles at once, while the write, sent when they end, is awaited by the Calculate that started them", async () => {
    const { store, sent, writes } = setUpWriting(() => false);
    const calculate = startAnalysis(store, "stats");
    const statsRequest = sentAt(sent, 0);
    expect(statsRequest.job.analysis).toBe("stats");

    const started = startWriting(store, "nei");

    expect(started).not.toBeNull();
    expect(await settled(started)).toBe(true);
    expect(sent).toHaveLength(1);
    expect(writes).toHaveLength(0);
    statsRequest.end({
      kind: "done",
      key: statsRequest.key,
      result: fiveStats(),
    });
    expect(await settled(calculate)).toBe(false);
    expect(writes).toHaveLength(1);
    const write = writes[0];
    write?.end({
      kind: "done",
      key: write.key,
      result: writtenFile(1150, 1200),
    });
    await calculate;

    expect(store.getState().write?.kind).toBe("done");
  });
});
