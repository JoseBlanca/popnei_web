import { describe, expect, test } from "vitest";

import { loadVariants } from "../core/project.ts";
import type { AnalysisStatus, Store } from "../core/store.ts";
import type { JobResult, Outcome, Run } from "../worker/protocol.ts";
import { createAutoRuns } from "./autoRuns.ts";
import { createPopgen2Store } from "./popgen2Store.ts";
import { startAnalysis } from "./runs.ts";

const ID = "variantsSummary";

/** The store of the new page with a fake `send` whose requests the test
    ends by hand, and the analyses it starts by itself. */
function setUp(): {
  readonly store: Store<JobResult, Blob>;
  readonly sent: ((outcome: Outcome<JobResult>) => void)[];
  readonly auto: ReturnType<typeof createAutoRuns>;
  readonly status: () => AnalysisStatus<JobResult>;
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
    appVersion: "0.1.0",
  });
  store.popneiReady("0.1.0");
  const auto = createAutoRuns({
    store,
    ids: [ID],
    start: (id) => startAnalysis(store, id),
  });
  const status = (): AnalysisStatus<JobResult> => {
    const view = store.getState().analyses.find((a) => a.id === ID);
    if (view === undefined) throw new Error("no summary in the store");
    return view.status;
  };
  return { store, sent, auto, status };
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

  test("Count again does nothing while the summary is running or done", () => {
    const { store, auto, sent } = setUp();
    open(store, FIRST);
    auto.sync();

    auto.again(ID);

    expect(sent).toHaveLength(1);
  });
});
