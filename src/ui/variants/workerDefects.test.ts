import { describe, expect, test } from "vitest";

import { loadIndividuals, loadVariants } from "../../core/project.ts";
import type { Store } from "../../core/store.ts";
import { summaryResult } from "../../core/testSupport.ts";
import type {
  JobResult,
  Outcome,
  Run,
  Written,
} from "../../worker/protocol.ts";
import { createDefects } from "../defects.ts";
import { createPopgen2Store } from "../popgen2Store.ts";
import { startAnalysis, startWriting } from "../runs.ts";
import { SUMMARY_ID, summaryStatus } from "./words.ts";
import { reportDefects } from "./workerDefects.ts";

const FILE_ID = "0123456789abcdef0123456789abcdef";

/** The store of the new page with a fake `send` ended by hand, and
    panel.nei open and read. */
function setUp(): {
  readonly store: Store<JobResult, Blob>;
  readonly sent: ((outcome: Outcome<JobResult>) => void)[];
} {
  const sent: ((outcome: Outcome<JobResult>) => void)[] = [];
  let lastId = 0;
  const store = createPopgen2Store({
    send: (): Run<JobResult> => {
      lastId += 1;
      const outcome = new Promise<Outcome<JobResult>>((resolve) => {
        sent.push(resolve);
      });
      return { id: lastId, outcome, cancel: () => undefined };
    },
    sendWrite: () => {
      throw new Error("popnei_web defect: no write is sent here");
    },
    appVersion: "0.1.0",
  });
  store.popneiReady("0.1.0");
  store.apply("a new variants file was loaded", (p) =>
    loadVariants(p, {
      fileId: FILE_ID,
      name: "panel.nei",
      size: 261_490,
      format: "nei",
      readOptions: null,
    }),
  );
  store.variantsRead(FILE_ID, {
    kind: "read",
    individuals: ["s1", "s2"],
    ploidy: 2,
    numVars: null,
    keepsPassed: false,
  });
  return { store, sent };
}

const INDIVIDUALS_ID = "00000000000000000000000000000001";

/** Loads an individuals file, whose read `touch` records later. */
function loadPops(store: Store<JobResult, Blob>): void {
  store.apply("an individuals file was loaded", (p) =>
    loadIndividuals(p, {
      fileId: INDIVIDUALS_ID,
      name: "pops.xlsx",
      csv: null,
    }),
  );
}

/** Changes the store with no change of the user, which keeps the
    failures shown: the individuals file of `loadPops` read, or not; the
    test fails when no listener was called. */
function touch(store: Store<JobResult, Blob>): void {
  const calls = { count: 0 };
  const stop = store.subscribe(() => {
    calls.count += 1;
  });
  store.individualsRead(INDIVIDUALS_ID, null, {
    kind: "failed",
    error: {
      kind: "worker",
      error: { kind: "workerFailed", message: "the light worker stopped" },
    },
  });
  stop();
  if (calls.count === 0) {
    throw new Error("the change of the test called no listener");
  }
}

/** Lets the outcomes given settle through `startAnalysis`. */
async function settled(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("the defects of the worker given to the error bar of the new page", () => {
  test("a defect of the count is reported once, with its message and no stack of the page", async () => {
    const { store, sent } = setUp();
    const defects = createDefects();
    reportDefects(store, defects);
    loadPops(store);

    void startAnalysis(store, SUMMARY_ID);
    sent[0]?.({
      kind: "failed",
      error: { kind: "defect", message: "popnei_web defect: a test." },
    });
    await settled();
    // Another change of the store, with the failure still shown.
    touch(store);
    expect(summaryStatus(store.getState()).kind).toBe("error");

    expect(defects.getState()).toEqual({
      first: {
        message: "popnei_web defect: a test.",
        origin: "worker",
        details:
          "Error 1, thrown in the calculation worker during an opening or a calculation, given back to the page as its failure:\npopnei_web defect: a test.",
      },
      more: 0,
    });
  });

  test("a worker that stopped during the count is reported once, with what it said", async () => {
    const { store, sent } = setUp();
    const defects = createDefects();
    reportDefects(store, defects);
    loadPops(store);

    void startAnalysis(store, SUMMARY_ID);
    sent[0]?.({
      kind: "failed",
      error: { kind: "workerFailed", message: "out of memory" },
    });
    await settled();
    touch(store);
    expect(summaryStatus(store.getState()).kind).toBe("error");

    expect(defects.getState()).toEqual({
      first: {
        message: "out of memory",
        origin: "countStopped",
        details:
          "Error 1, the calculation worker stopped during the count of the variants and the statistics of the file, with these words:\nout of memory",
      },
      more: 0,
    });
  });

  test("a worker that stopped during the opening is reported once, with what it said", () => {
    const { store } = setUp();
    const defects = createDefects();
    reportDefects(store, defects);
    const OTHER_ID = "fedcba9876543210fedcba9876543210";

    store.apply("a new variants file was loaded", (p) =>
      loadVariants(p, {
        fileId: OTHER_ID,
        name: "panel.vcf.gz",
        size: 87_000,
        format: "vcf",
        readOptions: { ploidy: null, onlyPassed: false },
      }),
    );
    const failed = {
      kind: "failed",
      error: {
        kind: "worker",
        error: {
          kind: "workerFailed",
          message: "wasm.default_ploidy is not a function",
        },
      },
    } as const;
    loadPops(store);
    store.variantsRead(OTHER_ID, failed);
    // Another change of the store, with the failure still shown, is
    // reported no second time.
    touch(store);
    expect(store.getState().project.variants?.read.kind).toBe("failed");

    expect(defects.getState()).toEqual({
      first: {
        message: "wasm.default_ploidy is not a function",
        origin: "openingStopped",
        details:
          "Error 1, the calculation worker stopped during the opening of a file, with these words:\nwasm.default_ploidy is not a function",
      },
      more: 0,
    });
  });

  test("a defect of our code met during the opening, sent as a defect by the worker, is reported once, with its message", () => {
    const { store } = setUp();
    const defects = createDefects();
    reportDefects(store, defects);
    const OTHER_ID = "fedcba9876543210fedcba9876543210";

    store.apply("a new variants file was loaded", (p) =>
      loadVariants(p, {
        fileId: OTHER_ID,
        name: "panel.vcf.gz",
        size: 87_000,
        format: "vcf",
        readOptions: { ploidy: null, onlyPassed: false },
      }),
    );
    loadPops(store);
    store.variantsRead(OTHER_ID, {
      kind: "failed",
      error: {
        kind: "worker",
        error: {
          kind: "defect",
          message: "popnei refused an unknown option: foo",
        },
      },
    });
    touch(store);

    expect(defects.getState()).toEqual({
      first: {
        message: "popnei refused an unknown option: foo",
        origin: "worker",
        details:
          "Error 1, thrown in the calculation worker during an opening or a calculation, given back to the page as its failure:\npopnei refused an unknown option: foo",
      },
      more: 0,
    });
  });

  test("a failure that is neither a defect of our code nor a worker that stopped is not reported", async () => {
    const { store, sent } = setUp();
    const defects = createDefects();
    reportDefects(store, defects);

    void startAnalysis(store, SUMMARY_ID);
    sent[0]?.({
      kind: "failed",
      error: { kind: "popnei", message: "the pass gave no variant" },
    });
    await settled();

    expect(defects.getState().first).toBeNull();
  });
});

/** The store of the new page with fakes of `send` and `sendWrite` ended
    by hand, panel.nei open and read, and its one pass finished. */
async function setUpWrite(): Promise<{
  readonly store: Store<JobResult, Blob>;
  readonly writes: ((outcome: Outcome<Written<Blob>>) => void)[];
}> {
  const sent: ((outcome: Outcome<JobResult>) => void)[] = [];
  const writes: ((outcome: Outcome<Written<Blob>>) => void)[] = [];
  let lastId = 0;
  const store = createPopgen2Store({
    send: (): Run<JobResult> => {
      lastId += 1;
      const outcome = new Promise<Outcome<JobResult>>((resolve) => {
        sent.push(resolve);
      });
      return { id: lastId, outcome, cancel: () => undefined };
    },
    sendWrite: (): Run<Written<Blob>> => {
      lastId += 1;
      const outcome = new Promise<Outcome<Written<Blob>>>((resolve) => {
        writes.push(resolve);
      });
      return { id: lastId, outcome, cancel: () => undefined };
    },
    appVersion: "0.1.0",
  });
  store.popneiReady("0.1.0");
  store.apply("a new variants file was loaded", (p) =>
    loadVariants(p, {
      fileId: FILE_ID,
      name: "panel.nei",
      size: 261_490,
      format: "nei",
      readOptions: null,
    }),
  );
  store.variantsRead(FILE_ID, {
    kind: "read",
    individuals: ["s000", "s001"],
    ploidy: 2,
    numVars: null,
    keepsPassed: false,
  });
  void startAnalysis(store, SUMMARY_ID);
  const key = summaryStatus(store.getState());
  if (key.kind !== "running") throw new Error("the pass did not start");
  sent[0]?.({
    kind: "done",
    key: key.key,
    result: summaryResult(["chr1"], [100]),
  });
  await settled();
  expect(summaryStatus(store.getState()).kind).toBe("done");
  return { store, writes };
}

describe("DL6 D3 the failures of a write given to the error bar of the new page", () => {
  test("a worker that stopped during the write is reported once, with what it said", async () => {
    const { store, writes } = await setUpWrite();
    const defects = createDefects();
    reportDefects(store, defects);
    loadPops(store);

    void startWriting(store, "vcf");
    writes[0]?.({
      kind: "failed",
      error: { kind: "workerFailed", message: "out of memory" },
    });
    await settled();
    touch(store);
    expect(store.getState().write?.kind).toBe("error");

    expect(defects.getState()).toEqual({
      first: {
        message: "out of memory",
        origin: "writeStopped",
        details:
          "Error 1, the calculation worker stopped during the writing of the filtered variants, with these words:\nout of memory",
      },
      more: 0,
    });
  });

  test("a defect of the write is reported once, and popnei's refusal is not", async () => {
    const { store, writes } = await setUpWrite();
    const defects = createDefects();
    reportDefects(store, defects);
    loadPops(store);

    void startWriting(store, "nei");
    writes[0]?.({
      kind: "failed",
      error: { kind: "popnei", message: "memory could not grow" },
    });
    await settled();
    expect(store.getState().write).toMatchObject({
      kind: "error",
      error: { kind: "refused" },
    });
    expect(defects.getState().first).toBeNull();

    void startWriting(store, "vcf");
    writes[1]?.({
      kind: "failed",
      error: { kind: "defect", message: "popnei_web defect: a test." },
    });
    await settled();
    touch(store);

    expect(defects.getState()).toEqual({
      first: {
        message: "popnei_web defect: a test.",
        origin: "worker",
        details:
          "Error 1, thrown in the calculation worker during an opening or a calculation, given back to the page as its failure:\npopnei_web defect: a test.",
      },
      more: 0,
    });
  });
});
