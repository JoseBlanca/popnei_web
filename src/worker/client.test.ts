import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createClient, WORKER_READY_TIMEOUT_MS } from "./client.ts";
import {
  parseToFilesRunner,
  parseToRunner,
  type ToFilesRunner,
  type ToRunner,
} from "./messages.ts";
import type { DiversityJob, DiversityResult, Progress } from "./protocol.ts";

/**
 * A worker the test drives by hand: it records what it is sent and
 * whether it was ended, and a message the test makes it post reaches the
 * handler set on it at that moment, also after `terminate`, as a message
 * a real worker posted before it was ended can still arrive.
 */
interface FakeWorker {
  readonly posted: unknown[];
  terminated: boolean;
  /** Whether a handler was still set when it was ended. */
  endedWithHandlers: boolean;
  /** An error the next `postMessage` throws, as a DataCloneError. */
  postError: Error | null;
  postMessage(message: unknown): void;
  terminate(): void;
  onmessage: ((event: { readonly data: unknown }) => unknown) | null;
  onerror:
    | ((event: { readonly message: string; preventDefault(): void }) => unknown)
    | null;
  onmessageerror: ((event: { readonly data: unknown }) => unknown) | null;
}

function fakeWorker(): FakeWorker {
  const worker: FakeWorker = {
    posted: [],
    terminated: false,
    endedWithHandlers: false,
    postError: null,
    postMessage(message) {
      const error = worker.postError;
      if (error !== null) {
        worker.postError = null;
        throw error;
      }
      worker.posted.push(message);
    },
    terminate() {
      worker.terminated = true;
      worker.endedWithHandlers =
        worker.onmessage !== null ||
        worker.onerror !== null ||
        worker.onmessageerror !== null;
    },
    onmessage: null,
    onerror: null,
    onmessageerror: null,
  };
  return worker;
}

/** Makes the worker post `data` to the page. */
function emit(worker: FakeWorker, data: unknown): void {
  worker.onmessage?.({ data });
}

/** The requests the calculation worker was sent, checked. */
function sentTo(worker: FakeWorker): ToRunner[] {
  return worker.posted.map((message) => {
    const parsed = parseToRunner(message);
    if (!parsed.ok) {
      throw new Error(`the client sent a wrong request: ${String(message)}`);
    }
    return parsed.value;
  });
}

/** The requests the light worker was sent, checked. */
function sentToLight(worker: FakeWorker): ToFilesRunner[] {
  return worker.posted.map((message) => {
    const parsed = parseToFilesRunner(message);
    if (!parsed.ok) {
      throw new Error(`the client sent a wrong request: ${String(message)}`);
    }
    return parsed.value;
  });
}

function lastSent(worker: FakeWorker): ToRunner {
  const sent = sentTo(worker).at(-1);
  if (sent === undefined) {
    throw new Error("the worker was sent nothing");
  }
  return sent;
}

/** The answer of a promise if it has one now, or "pending". */
async function now<T>(promise: Promise<T>): Promise<T | "pending"> {
  return Promise.race([promise, Promise.resolve("pending" as const)]);
}

const FILE_A = new File(["NEI A"], "panel.nei");
const FILE_B = new File(["NEI B"], "other.nei");
const FILE_C = new File(["NEI C"], "third.nei");
const CSV_FILE = new File(["id,pop\ni1,p0\n"], "individuals.csv");
const NEI = { format: "nei", readOptions: null } as const;
const CSV = { encoding: "auto", separator: "auto", decimal: "auto" } as const;

const READY = { kind: "ready", protocol: 1, popneiVersion: "0.1.0" };
const LIGHT_READY = { kind: "ready", protocol: 1 };
const INDIVIDUALS = Array.from({ length: 200 }, (_, i) => `i${String(i + 1)}`);
const RESULT: DiversityResult = {
  analysis: "diversity",
  pops: ["p0"],
  numIndividuals: Uint32Array.from([200]),
  unbiasedExpHet: Float64Array.from([0.31]),
  obsHet: Float64Array.from([0.28]),
  polyRatio: Float64Array.from([0.9]),
  numVarsWithValue: Uint32Array.from([1152]),
  numVars: 1152,
  numVarsRead: 1200,
};
const TABLE_READ = {
  kind: "read",
  table: { columns: ["id", "pop"], rows: [["i1", "p0"]] },
  columns: [{ kind: "identifier" }, { kind: "categorical" }],
  found: { encoding: "utf-8", separator: ",", decimal: "." },
} as const;

function job(fileId: string): DiversityJob {
  return {
    analysis: "diversity",
    fileId,
    filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.05 }],
    individualFilters: [],
    pops: [["p0", INDIVIDUALS]],
    minNumIndividuals: 20,
    polyThreshold: 0.95,
  };
}

function opened(id: number): unknown {
  return { kind: "opened", id, individuals: INDIVIDUALS, ploidy: 2 };
}

function resultOf(id: number, key: string): unknown {
  return { kind: "result", id, key, result: RESULT };
}

/** The progress of a run the test does not look at. */
function noProgress(): void {
  // Nothing: the test does not look at the progress of this run.
}

/** A client over fake workers, with the workers it made and the versions
    it gave `onPopneiReady`, which calls `hooks.onReady` too. */
function setUp(options: { readonly calculationThrows?: number } = {}): {
  readonly client: ReturnType<typeof createClient>;
  readonly calculation: FakeWorker[];
  readonly light: FakeWorker[];
  readonly versions: string[];
  readonly hooks: { onReady: (version: string) => void };
} {
  const calculation: FakeWorker[] = [];
  const light: FakeWorker[] = [];
  const versions: string[] = [];
  const hooks: { onReady: (version: string) => void } = {
    onReady: () => undefined,
  };
  let throwsLeft = options.calculationThrows ?? 0;
  const client = createClient({
    calculation: () => {
      if (throwsLeft > 0) {
        throwsLeft -= 1;
        throw new Error("the script of the worker is not served");
      }
      const worker = fakeWorker();
      calculation.push(worker);
      return worker;
    },
    light: () => {
      const worker = fakeWorker();
      light.push(worker);
      return worker;
    },
    onPopneiReady: (version) => {
      versions.push(version);
      hooks.onReady(version);
    },
  });
  return { client, calculation, light, versions, hooks };
}

function last(workers: readonly FakeWorker[]): FakeWorker {
  const worker = workers.at(-1);
  if (worker === undefined) {
    throw new Error("no worker was made");
  }
  return worker;
}

/** A client whose first calculation worker is ready and has read load A,
    `panel.nei`. */
function withA(): ReturnType<typeof setUp> & { readonly first: FakeWorker } {
  const env = setUp();
  const first = last(env.calculation);
  env.client.addFile("A", FILE_A);
  env.client.openVariants({ fileId: "A", ...NEI });
  emit(first, READY);
  emit(first, opened(lastSent(first).id));
  return { ...env, first };
}

/** Load A read, a run r1 running on the first worker and a run r2
    waiting. */
function twoRuns(): ReturnType<typeof withA> & {
  readonly r1: ReturnType<ReturnType<typeof createClient>["run"]>;
  readonly r2: ReturnType<ReturnType<typeof createClient>["run"]>;
} {
  const env = withA();
  const r1 = env.client.run("r1", job("A"), noProgress);
  const r2 = env.client.run("r2", job("A"), noProgress);
  expect(lastSent(env.first)).toMatchObject({ kind: "run", key: "r1" });
  return { ...env, r1, r2 };
}

/** The new worker after a failure opens A again, and is then sent r2; a
    message the old worker posts after it was ended changes nothing. */
function expectRestartedWithR2(env: ReturnType<typeof twoRuns>): void {
  expect(env.first.terminated).toBe(true);
  expect(env.first.endedWithHandlers).toBe(false);
  expect(env.calculation).toHaveLength(2);
  const second = last(env.calculation);
  emit(second, READY);
  const open = lastSent(second);
  expect(open).toMatchObject({ kind: "open", fileId: "A" });
  emit(second, opened(open.id));
  expect(lastSent(second)).toMatchObject({
    kind: "run",
    id: env.r2.id,
    key: "r2",
  });
  emit(env.first, resultOf(env.r1.id, "r1"));
  emit(env.first, { kind: "crashed", message: "late" });
  expect(env.calculation).toHaveLength(2);
  expect(second.posted).toHaveLength(2);
}

describe("WS2 D3 the client: the worked sequence", () => {
  test("a read, two runs, a cancel and the worker started again", async () => {
    const env = setUp();
    expect(env.calculation).toHaveLength(1);
    expect(env.light).toHaveLength(0);
    const first = last(env.calculation);
    expect(first.posted).toEqual([]);

    env.client.addFile("A", FILE_A);
    const readA = env.client.openVariants({ fileId: "A", ...NEI });
    expect(first.posted).toEqual([]);

    emit(first, READY);
    expect(env.versions).toEqual(["0.1.0"]);
    const open = lastSent(first);
    expect(open).toMatchObject({ kind: "open", fileId: "A", ...NEI });
    expect(open.kind === "open" && open.file).toBe(FILE_A);

    const k1 = env.client.run("k1", job("A"), noProgress);
    expect(first.posted).toHaveLength(1);

    emit(first, opened(open.id));
    expect(await now(readA.outcome)).toEqual({
      kind: "opened",
      individuals: INDIVIDUALS,
      ploidy: 2,
    });
    expect(lastSent(first)).toEqual({
      kind: "run",
      id: k1.id,
      key: "k1",
      job: job("A"),
    });

    const k2 = env.client.run("k2", job("A"), noProgress);
    expect(first.posted).toHaveLength(2);

    emit(first, resultOf(k1.id, "k1"));
    expect(await now(k1.outcome)).toEqual({
      kind: "done",
      key: "k1",
      result: RESULT,
    });
    expect(lastSent(first)).toMatchObject({ kind: "run", id: k2.id });

    k2.cancel();
    expect(await now(k2.outcome)).toEqual({ kind: "cancelled" });
    expect(first.terminated).toBe(true);
    expect(first.endedWithHandlers).toBe(false);
    expect(env.calculation).toHaveLength(2);

    const second = last(env.calculation);
    emit(second, READY);
    const reopen = lastSent(second);
    expect(reopen).toMatchObject({ kind: "open", fileId: "A" });
    expect(reopen.kind === "open" && reopen.file).toBe(FILE_A);
    expect(env.versions).toEqual(["0.1.0"]);

    const k3 = env.client.run("k3", job("A"), noProgress);
    expect(second.posted).toHaveLength(1);

    emit(second, opened(reopen.id));
    expect(env.versions).toEqual(["0.1.0", "0.1.0"]);
    expect(lastSent(second)).toMatchObject({ kind: "run", id: k3.id });
  });
});

describe("WS2 D3 the client: the load", () => {
  test("a read of another load ends the worker and opens it on a new one", () => {
    const env = withA();
    env.client.addFile("B", FILE_B);
    env.client.openVariants({ fileId: "B", ...NEI });
    expect(env.first.terminated).toBe(true);
    expect(env.calculation).toHaveLength(2);
    const second = last(env.calculation);
    emit(second, READY);
    const open = lastSent(second);
    expect(open).toMatchObject({ kind: "open", fileId: "B" });
    expect(open.kind === "open" && open.file).toBe(FILE_B);
    expect(env.versions).toEqual(["0.1.0", "0.1.0"]);
  });

  test("a read of a third load cancels the open of the second at once", async () => {
    const env = withA();
    env.client.addFile("B", FILE_B);
    const readB = env.client.openVariants({ fileId: "B", ...NEI });
    const second = last(env.calculation);
    emit(second, READY);
    env.client.addFile("C", FILE_C);
    env.client.openVariants({ fileId: "C", ...NEI });
    expect(await now(readB.outcome)).toEqual({ kind: "cancelled" });
    expect(second.terminated).toBe(true);
    expect(env.calculation).toHaveLength(3);
    emit(last(env.calculation), READY);
    expect(lastSent(last(env.calculation))).toMatchObject({
      kind: "open",
      fileId: "C",
    });
  });

  test("a read of a known load with other read options is a defect, thrown", () => {
    const env = withA();
    expect(() =>
      env.client.openVariants({
        fileId: "A",
        format: "vcf",
        readOptions: { ploidy: 2, onlyPassed: false },
      }),
    ).toThrow("popnei_web defect");
  });

  test("a second read of the load the worker opened gets its answer and sends nothing", async () => {
    const env = withA();
    const again = env.client.openVariants({ fileId: "A", ...NEI });
    expect(await now(again.outcome)).toEqual({
      kind: "opened",
      individuals: INDIVIDUALS,
      ploidy: 2,
    });
    expect(env.first.posted).toHaveLength(1);
  });
});

describe("WS2 D3 the client: cancelling", () => {
  test("a run that waits leaves the queue, and no worker is ended", async () => {
    const env = twoRuns();
    env.r2.cancel();
    expect(await now(env.r2.outcome)).toEqual({ kind: "cancelled" });
    expect(env.first.terminated).toBe(false);
    emit(env.first, resultOf(env.r1.id, "r1"));
    expect(env.first.posted).toHaveLength(2);
  });

  test("a run that waits for its open leaves the queue, and the open goes on", async () => {
    const env = withA();
    const k1 = env.client.run("k1", job("A"), noProgress);
    k1.cancel();
    const second = last(env.calculation);
    const k2 = env.client.run("k2", job("A"), noProgress);
    emit(second, READY);
    const open = lastSent(second);
    expect(open).toMatchObject({ kind: "open", fileId: "A" });
    k2.cancel();
    expect(await now(k2.outcome)).toEqual({ kind: "cancelled" });
    expect(second.terminated).toBe(false);
    emit(second, opened(open.id));
    expect(second.posted).toHaveLength(1);
    const k3 = env.client.run("k3", job("A"), noProgress);
    expect(lastSent(second)).toMatchObject({ kind: "run", id: k3.id });
  });

  test("the read of a variants file that runs ends its worker", async () => {
    const env = setUp();
    const first = last(env.calculation);
    env.client.addFile("A", FILE_A);
    const readA = env.client.openVariants({ fileId: "A", ...NEI });
    emit(first, READY);
    readA.cancel();
    expect(await now(readA.outcome)).toEqual({ kind: "cancelled" });
    expect(first.terminated).toBe(true);
    expect(env.calculation).toHaveLength(2);
  });

  test("the read of the individuals file that runs is cancelled at once, and its answer goes to no one", async () => {
    const env = setUp();
    env.client.addFile("ind", CSV_FILE);
    const first = env.client.readIndividuals("ind", CSV);
    const second = env.client.readIndividuals("ind", CSV);
    const worker = last(env.light);
    emit(worker, LIGHT_READY);
    expect(sentToLight(worker)).toHaveLength(1);
    first.cancel();
    expect(await now(first.outcome)).toEqual({ kind: "cancelled" });
    expect(worker.terminated).toBe(false);
    expect(sentToLight(worker)).toHaveLength(1);
    emit(worker, { kind: "individuals", id: 1, read: TABLE_READ });
    expect(await now(first.outcome)).toEqual({ kind: "cancelled" });
    const sent = sentToLight(worker);
    expect(sent).toHaveLength(2);
    const next = sent.at(-1);
    expect(next?.file).toBe(CSV_FILE);
    emit(worker, { kind: "individuals", id: next?.id, read: TABLE_READ });
    expect(await now(second.outcome)).toEqual(TABLE_READ);
  });

  test("a cancel of a request that has ended, or a second one, does nothing", async () => {
    const env = twoRuns();
    env.r2.cancel();
    env.r2.cancel();
    emit(env.first, resultOf(env.r1.id, "r1"));
    env.r1.cancel();
    env.r1.cancel();
    expect(await now(env.r1.outcome)).toMatchObject({ kind: "done" });
    expect(await now(env.r2.outcome)).toEqual({ kind: "cancelled" });
    expect(env.first.terminated).toBe(false);
    expect(env.first.posted).toHaveLength(2);
    expect(env.calculation).toHaveLength(1);
  });

  test("a cancel made inside onPopneiReady is seen: the run it cancels is not sent", async () => {
    const env = twoRuns();
    emit(env.first, { kind: "crashed", message: "unreachable" });
    const second = last(env.calculation);
    env.hooks.onReady = () => {
      env.r2.cancel();
    };
    emit(second, READY);
    const open = lastSent(second);
    emit(second, opened(open.id));
    expect(env.versions).toEqual(["0.1.0", "0.1.0"]);
    expect(await now(env.r2.outcome)).toEqual({ kind: "cancelled" });
    expect(second.posted).toHaveLength(1);
  });
});

describe("WS2 D3 the client: the reopen that fails", () => {
  /** A worker started again after a cancel, sent the open of A, with the
      run k2 waiting on it. */
  function reopening(): ReturnType<typeof withA> & {
    readonly second: FakeWorker;
    readonly openId: number;
    readonly k2: ReturnType<ReturnType<typeof createClient>["run"]>;
  } {
    const env = withA();
    env.client.run("k1", job("A"), noProgress).cancel();
    const second = last(env.calculation);
    const k2 = env.client.run("k2", job("A"), noProgress);
    emit(second, READY);
    return { ...env, second, openId: lastSent(second).id, k2 };
  }

  test("an open refused fails the run waiting on it as a file changed, and ends the worker", async () => {
    const env = reopening();
    emit(env.second, {
      kind: "refused",
      id: env.openId,
      message: "not a vars file",
    });
    expect(await now(env.k2.outcome)).toEqual({
      kind: "failed",
      error: {
        kind: "reopenFailed",
        name: "panel.nei",
        message: "not a vars file",
      },
    });
    expect(env.second.terminated).toBe(true);
  });

  test("an open that ends reopenFailed fails the run waiting on it, and ends the worker", async () => {
    const env = reopening();
    emit(env.second, {
      kind: "reopenFailed",
      id: env.openId,
      name: "panel.nei",
      message: "the browser gave a range short",
    });
    expect(await now(env.k2.outcome)).toEqual({
      kind: "failed",
      error: {
        kind: "reopenFailed",
        name: "panel.nei",
        message: "the browser gave a range short",
      },
    });
    expect(env.second.terminated).toBe(true);
  });

  test("the next run on that load is not a defect: a new worker opens the file, then runs it", async () => {
    const env = reopening();
    emit(env.second, {
      kind: "refused",
      id: env.openId,
      message: "not a vars file",
    });
    const k3 = env.client.run("k3", job("A"), noProgress);
    expect(await now(k3.outcome)).toBe("pending");
    const third = last(env.calculation);
    expect(env.calculation).toHaveLength(3);
    emit(third, READY);
    const open = lastSent(third);
    expect(open).toMatchObject({ kind: "open", fileId: "A" });
    emit(third, opened(open.id));
    expect(lastSent(third)).toMatchObject({ kind: "run", id: k3.id });
  });

  test("a run that ends reopenFailed fails with it, and the worker is not ended", async () => {
    const env = twoRuns();
    emit(env.first, {
      kind: "reopenFailed",
      id: env.r1.id,
      name: "panel.nei",
      message: "the browser refused the range",
    });
    expect(await now(env.r1.outcome)).toEqual({
      kind: "failed",
      error: {
        kind: "reopenFailed",
        name: "panel.nei",
        message: "the browser refused the range",
      },
    });
    expect(env.first.terminated).toBe(false);
    expect(lastSent(env.first)).toMatchObject({ kind: "run", id: env.r2.id });
  });
});

describe("WS2 D3 the client: progress", () => {
  test("each progress of a run reaches its onProgress as it came, then its result ends it", async () => {
    const env = withA();
    const seen: Progress[] = [];
    const run = env.client.run("k1", job("A"), (p) => {
      seen.push(p);
    });
    const first = {
      bytesRead: 130000,
      numBytes: 261490,
      pass: 1,
      numPasses: 1,
    };
    const second = {
      bytesRead: 259376,
      numBytes: 261490,
      pass: 1,
      numPasses: 1,
    };
    emit(env.first, { kind: "progress", id: run.id, ...first });
    emit(env.first, { kind: "progress", id: run.id, ...second });
    emit(env.first, resultOf(run.id, "k1"));
    expect(seen).toEqual([first, second]);
    expect(await now(run.outcome)).toMatchObject({ kind: "done", key: "k1" });
  });

  test("a progress of an id that is not running is a defect, and the worker is ended", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const env = twoRuns();
    emit(env.first, {
      kind: "progress",
      id: env.r2.id,
      bytesRead: 1,
      numBytes: 2,
      pass: 1,
      numPasses: 1,
    });
    expect(await now(env.r1.outcome)).toMatchObject({
      kind: "failed",
      error: { kind: "defect" },
    });
    expect(env.first.terminated).toBe(true);
  });
});

describe("WS2 D3 the client: a defect of the page", () => {
  test("a read of a load with no File fails at once as a defect", async () => {
    const env = setUp();
    const read = env.client.openVariants({ fileId: "Z", ...NEI });
    expect(await now(read.outcome)).toMatchObject({
      kind: "failed",
      error: { kind: "defect" },
    });
  });

  test("a run of a load with no File fails at once as a defect", async () => {
    const env = withA();
    const run = env.client.run("k1", job("Z"), noProgress);
    expect(await now(run.outcome)).toMatchObject({
      kind: "failed",
      error: { kind: "defect" },
    });
    expect(env.first.posted).toHaveLength(1);
  });

  test("a run of a load whose first open was refused fails at once as a defect", async () => {
    const env = setUp();
    const first = last(env.calculation);
    env.client.addFile("A", FILE_A);
    const readA = env.client.openVariants({ fileId: "A", ...NEI });
    emit(first, READY);
    emit(first, {
      kind: "refused",
      id: lastSent(first).id,
      message: "not a vars file",
    });
    expect(await now(readA.outcome)).toEqual({
      kind: "failed",
      error: { kind: "popnei", message: "not a vars file" },
    });
    const run = env.client.run("k1", job("A"), noProgress);
    expect(await now(run.outcome)).toMatchObject({
      kind: "failed",
      error: { kind: "defect" },
    });
    expect(first.posted).toHaveLength(1);
  });

  test("an onPopneiReady that throws: the throw reaches the caller, and the next request is still sent", () => {
    const env = setUp();
    const first = last(env.calculation);
    env.client.addFile("A", FILE_A);
    env.client.openVariants({ fileId: "A", ...NEI });
    env.hooks.onReady = () => {
      throw new Error("a screen failed");
    };
    expect(() => {
      emit(first, READY);
    }).toThrow("a screen failed");
    expect(lastSent(first)).toMatchObject({ kind: "open", fileId: "A" });
  });
});

describe("WS2 D3 the client: crashes, defects, and every read answered", () => {
  test("refused: the run fails with popnei's message, and the worker goes on", async () => {
    const env = twoRuns();
    emit(env.first, {
      kind: "refused",
      id: env.r1.id,
      message: "the pass gave no variant",
    });
    expect(await now(env.r1.outcome)).toEqual({
      kind: "failed",
      error: { kind: "popnei", message: "the pass gave no variant" },
    });
    expect(env.first.terminated).toBe(false);
    expect(lastSent(env.first)).toMatchObject({ kind: "run", id: env.r2.id });
  });

  test("reopenFailed: the run fails with it, and the worker goes on", async () => {
    const env = twoRuns();
    emit(env.first, {
      kind: "reopenFailed",
      id: env.r1.id,
      name: "panel.nei",
      message: "short",
    });
    expect(await now(env.r1.outcome)).toMatchObject({
      kind: "failed",
      error: { kind: "reopenFailed", name: "panel.nei" },
    });
    expect(env.first.terminated).toBe(false);
    expect(lastSent(env.first)).toMatchObject({ kind: "run", id: env.r2.id });
  });

  test("crashed: the run fails as workerFailed, and the worker is started again", async () => {
    const env = twoRuns();
    emit(env.first, { kind: "crashed", message: "unreachable executed" });
    expect(await now(env.r1.outcome)).toEqual({
      kind: "failed",
      error: { kind: "workerFailed", message: "unreachable executed" },
    });
    expectRestartedWithR2(env);
  });

  test("an error event: the run fails as workerFailed, the event is stopped, and the worker is started again", async () => {
    const env = twoRuns();
    let prevented = false;
    env.first.onerror?.({
      message: "",
      preventDefault: () => {
        prevented = true;
      },
    });
    expect(prevented).toBe(true);
    expect(await now(env.r1.outcome)).toEqual({
      kind: "failed",
      error: {
        kind: "workerFailed",
        message: "the worker stopped with no message",
      },
    });
    expectRestartedWithR2(env);
  });

  test("messageerror: the run fails as workerFailed, and the worker is started again", async () => {
    const env = twoRuns();
    env.first.onmessageerror?.({ data: null });
    expect(await now(env.r1.outcome)).toMatchObject({
      kind: "failed",
      error: { kind: "workerFailed" },
    });
    expectRestartedWithR2(env);
  });

  test("badRequest: the run fails as a defect, and the worker is started again", async () => {
    const env = twoRuns();
    emit(env.first, {
      kind: "badRequest",
      message: "The message run lacks the fields id.",
    });
    expect(await now(env.r1.outcome)).toEqual({
      kind: "failed",
      error: {
        kind: "defect",
        message: "The message run lacks the fields id.",
      },
    });
    expectRestartedWithR2(env);
  });

  test.each([
    ["a message that fails its check", () => ({ kind: "result", id: 1 })],
    ["an answer of another request's id", () => resultOf(99, "r1")],
    ["an answer of the wrong kind for the request", () => opened(2)],
    ["a result under another key than its request's", () => resultOf(2, "k9")],
  ])(
    "%s: the run fails as a defect, written to the console, and the worker is started again",
    async (_name, message) => {
      const console_ = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);
      const env = twoRuns();
      expect(env.r1.id).toBe(2);
      emit(env.first, message());
      expect(await now(env.r1.outcome)).toMatchObject({
        kind: "failed",
        error: { kind: "defect" },
      });
      expect(console_).toHaveBeenCalledOnce();
      expectRestartedWithR2(env);
    },
  );

  test("postMessage that throws: the run fails as a defect with the browser's message, and the worker is started again", async () => {
    const env = withA();
    env.first.postError = new Error("The object could not be cloned.");
    const r1 = env.client.run("r1", job("A"), noProgress);
    expect(await now(r1.outcome)).toEqual({
      kind: "failed",
      error: { kind: "defect", message: "The object could not be cloned." },
    });
    expect(env.first.terminated).toBe(true);
    expect(env.calculation).toHaveLength(2);
  });

  test("a crash of a worker that was idle only starts it again, and it opens its load again", () => {
    const env = withA();
    emit(env.first, { kind: "crashed", message: "out of memory" });
    expect(env.first.terminated).toBe(true);
    const second = last(env.calculation);
    emit(second, READY);
    expect(lastSent(second)).toMatchObject({ kind: "open", fileId: "A" });
  });
});

describe("WS2 D3 the client: starting", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test("no ready twice gives the worker up: every request fails, and the light worker still reads", async () => {
    const env = setUp();
    env.client.addFile("A", FILE_A);
    env.client.addFile("ind", CSV_FILE);
    const readA = env.client.openVariants({ fileId: "A", ...NEI });
    vi.advanceTimersByTime(WORKER_READY_TIMEOUT_MS);
    expect(env.calculation).toHaveLength(2);
    expect(env.calculation[0]?.terminated).toBe(true);
    expect(await now(readA.outcome)).toBe("pending");
    vi.advanceTimersByTime(WORKER_READY_TIMEOUT_MS);
    expect(await now(readA.outcome)).toMatchObject({
      kind: "failed",
      error: { kind: "couldNotStart" },
    });
    env.client.addFile("B", FILE_B);
    const readB = env.client.openVariants({ fileId: "B", ...NEI });
    expect(await now(readB.outcome)).toMatchObject({
      kind: "failed",
      error: { kind: "couldNotStart" },
    });
    vi.advanceTimersByTime(3 * WORKER_READY_TIMEOUT_MS);
    expect(env.calculation).toHaveLength(2);

    const read = env.client.readIndividuals("ind", CSV);
    const lightWorker = last(env.light);
    emit(lightWorker, LIGHT_READY);
    emit(lightWorker, {
      kind: "individuals",
      id: sentToLight(lightWorker)[0]?.id,
      read: TABLE_READ,
    });
    expect(await now(read.outcome)).toEqual(TABLE_READ);
  });

  test("an answer between two failures sets the count back: a failure after it starts a worker again", () => {
    const env = setUp();
    env.client.addFile("A", FILE_A);
    env.client.openVariants({ fileId: "A", ...NEI });
    vi.advanceTimersByTime(WORKER_READY_TIMEOUT_MS);
    const second = last(env.calculation);
    emit(second, READY);
    emit(second, opened(lastSent(second).id));
    emit(second, { kind: "crashed", message: "out of memory" });
    expect(env.calculation).toHaveLength(3);
  });

  test("a worker that crashes idle after each ready, twice, is given up", async () => {
    const env = setUp();
    emit(last(env.calculation), READY);
    emit(last(env.calculation), { kind: "crashed", message: "trap" });
    emit(last(env.calculation), READY);
    emit(last(env.calculation), { kind: "crashed", message: "trap" });
    expect(env.calculation).toHaveLength(2);
    env.client.addFile("A", FILE_A);
    const readA = env.client.openVariants({ fileId: "A", ...NEI });
    expect(await now(readA.outcome)).toEqual({
      kind: "failed",
      error: { kind: "couldNotStart", reason: "trap" },
    });
  });

  test("a ready of protocol 2 fails every request with protocolMismatch, and no other worker is made", async () => {
    const env = setUp();
    env.client.addFile("A", FILE_A);
    const readA = env.client.openVariants({ fileId: "A", ...NEI });
    emit(last(env.calculation), { kind: "ready", protocol: 2 });
    expect(await now(readA.outcome)).toEqual({
      kind: "failed",
      error: { kind: "protocolMismatch" },
    });
    env.client.addFile("B", FILE_B);
    const readB = env.client.openVariants({ fileId: "B", ...NEI });
    expect(await now(readB.outcome)).toEqual({
      kind: "failed",
      error: { kind: "protocolMismatch" },
    });
    vi.advanceTimersByTime(3 * WORKER_READY_TIMEOUT_MS);
    expect(env.calculation).toHaveLength(1);
  });

  test("a new Worker that throws is a failed start, and twice gives the worker up", async () => {
    const env = setUp({ calculationThrows: 2 });
    expect(env.calculation).toHaveLength(0);
    env.client.addFile("A", FILE_A);
    const readA = env.client.openVariants({ fileId: "A", ...NEI });
    expect(await now(readA.outcome)).toEqual({
      kind: "failed",
      error: {
        kind: "couldNotStart",
        reason:
          "the worker could not be made: the script of the worker is not served",
      },
    });
  });

  test("the light worker is made at its first request, and sent it once ready", () => {
    const env = setUp();
    env.client.addFile("ind", CSV_FILE);
    expect(env.light).toHaveLength(0);
    env.client.readIndividuals("ind", CSV);
    const worker = last(env.light);
    expect(worker.posted).toEqual([]);
    emit(worker, LIGHT_READY);
    const sent = sentToLight(worker);
    expect(sent).toMatchObject([{ kind: "readIndividuals", csv: CSV }]);
    expect(sent[0]?.file).toBe(CSV_FILE);
  });
});
