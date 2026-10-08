import { expect, test, vi } from "vitest";

import { loadVariants } from "../core/project.ts";
import { summaryResult } from "../core/testSupport.ts";
import { PROTOCOL_VERSION } from "../worker/messages.ts";
import { connectStore, syncReads } from "./pageStart.tsx";
import { createPopgen2Store } from "./popgen2Store.ts";
import { summaryStatus } from "./variants/words.ts";

// The store and the worker client joined as the entry of popgen2.html
// joins them, over a calculation worker the test drives by hand, so that
// what the page's `send` passes on to the client is tested with no
// browser: a `send` that dropped the client's `onSoFar` would still type
// check against the store's, and the plots so far would be lost.

/** A worker the test drives: what it was sent, and the handler a message
    it posts reaches. */
interface FakeWorker {
  readonly posted: unknown[];
  postMessage: (message: unknown) => void;
  terminate: () => void;
  onmessage: ((event: { readonly data: unknown }) => unknown) | null;
  onerror: ((event: Event) => unknown) | null;
  onmessageerror: ((event: { readonly data: unknown }) => unknown) | null;
}

const workers = vi.hoisted(() => ({ calculation: [] as unknown[] }));

vi.mock("../worker/start.ts", () => ({
  makeRunnerWorker: () => {
    const worker: FakeWorker = {
      posted: [],
      postMessage: (message) => {
        worker.posted.push(message);
      },
      terminate: () => undefined,
      onmessage: null,
      onerror: null,
      onmessageerror: null,
    };
    workers.calculation.push(worker);
    return worker;
  },
  makeFilesWorker: () => {
    throw new Error("the test reads no individuals file");
  },
}));

function calculationWorker(): FakeWorker {
  const worker = workers.calculation.at(-1);
  if (worker === undefined) {
    throw new Error("no calculation worker was made");
  }
  // The mock above makes only FakeWorkers.
  return worker as FakeWorker;
}

/** The id of the last request of `kind` the worker was sent. */
function lastIdOf(worker: FakeWorker, kind: string): number {
  const sent = worker.posted.findLast(
    (message): message is { kind: string; id: number } =>
      typeof message === "object" &&
      message !== null &&
      "kind" in message &&
      message.kind === kind,
  );
  if (sent === undefined) {
    throw new Error(`the worker was sent no ${kind}`);
  }
  return sent.id;
}

test("live-stats 2 a result so far the worker posts reaches the summary's running status through the page's send", async () => {
  const { store, client } = connectStore((senders) =>
    createPopgen2Store({ ...senders, appVersion: "0.1.0" }),
  );
  const worker = calculationWorker();
  const fileId = "0123456789abcdef0123456789abcdef";
  client.addFile(fileId, new File(["NEI"], "panel.nei"));
  store.apply("a new variants file was loaded", (p) =>
    loadVariants(p, {
      fileId,
      name: "panel.nei",
      size: 3,
      format: "nei",
      readOptions: null,
    }),
  );
  syncReads(store, client);
  worker.onmessage?.({
    data: { kind: "ready", protocol: PROTOCOL_VERSION, popneiVersion: "0.2.1" },
  });
  worker.onmessage?.({
    data: {
      kind: "opened",
      id: lastIdOf(worker, "open"),
      individuals: ["s000", "s001"],
      ploidy: 2,
      keepsPassed: false,
    },
  });
  // The read's answer reaches the store once its promise settles.
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
  store.startRun("variantsSummary");
  const running = summaryStatus(store.getState());
  if (running.kind !== "running") {
    throw new Error(`the summary is ${running.kind}, not running`);
  }
  const soFar = summaryResult(["chr1"], [150]);

  worker.onmessage?.({
    data: {
      kind: "soFar",
      id: lastIdOf(worker, "run"),
      key: running.key,
      result: soFar,
    },
  });

  const status = summaryStatus(store.getState());
  expect(status).toMatchObject({
    kind: "running",
    soFar: { analysis: "variantsSummary" },
  });
  if (status.kind !== "running" || status.soFar === null) {
    throw new Error("no result so far reached the store");
  }
  expect(status.soFar.passStats.numVars).toBe(150);
});
