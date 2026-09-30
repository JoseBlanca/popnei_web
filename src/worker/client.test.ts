import fc from "fast-check";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  createClient,
  PCA_RESTART_INDIVIDUALS,
  WORKER_READY_TIMEOUT_MS,
  WRITE_RESTART_BYTES,
  type IndividualsAnswer,
  type VariantsOpened,
} from "./client.ts";
import {
  parseToFilesRunner,
  parseToRunner,
  type ToFilesRunner,
  type ToRunner,
} from "./messages.ts";
import type {
  DiversityJob,
  DiversityResult,
  JobResult,
  Outcome,
  PcaJob,
  PcaMethod,
  PcaResult,
  Progress,
  WriteJob,
  Written,
} from "./protocol.ts";
import { answerOfThrown } from "./runner.ts";

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
  postMessage: (message: unknown) => void;
  terminate: () => void;
  onmessage: ((event: { readonly data: unknown }) => unknown) | null;
  /** A worker whose script does not load fires a plain Event; one that
      stops on an error nothing caught, an ErrorEvent. */
  onerror: ((event: Event) => unknown) | null;
  onmessageerror: ((event: { readonly data: unknown }) => unknown) | null;
}

function fakeWorker(): FakeWorker {
  const worker: FakeWorker = {
    posted: [],
    terminated: false,
    endedWithHandlers: false,
    postError: null,
    postMessage: (message) => {
      const error = worker.postError;
      if (error !== null) {
        worker.postError = null;
        throw error;
      }
      worker.posted.push(message);
    },
    terminate: () => {
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

const READY = { kind: "ready", protocol: 4, popneiVersion: "0.1.0" };
const LIGHT_READY = { kind: "ready", protocol: 4 };
const INDIVIDUALS = Array.from({ length: 200 }, (_, i) => `i${String(i + 1)}`);
const RESULT: DiversityResult = {
  analysis: "diversity",
  pops: ["p0"],
  numIndividuals: Uint32Array.from([200]),
  unbiasedExpHet: Float64Array.from([0.31]),
  obsHet: Float64Array.from([0.28]),
  polyRatio: Float64Array.from([0.9]),
  numVarsWithValue: Uint32Array.from([1152]),
  passStats: {
    numVars: 1152,
    filtering: { missing_data: { varsProcessed: 1200, varsKept: 1152 } },
  },
};
const TABLE_READ = {
  kind: "read",
  table: { columns: ["id", "pop"], rows: [["i1", "p0"]] },
  columns: [{ kind: "identifier" }, { kind: "categorical" }],
  found: {
    encoding: "utf-8",
    separator: ",",
    decimal: ".",
    undecodedLine: null,
  },
} as const;

function job(fileId: string): DiversityJob {
  return {
    analysis: "diversity",
    fileId,
    filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.05 }],
    individuals: null,
    pops: [["p0", INDIVIDUALS]],
    minNumIndividuals: 20,
    polyThreshold: 0.95,
  };
}

function writeJob(fileId: string): WriteJob {
  return {
    format: "nei",
    fileId,
    filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.05 }],
    individuals: null,
  };
}

/** Files as the runner makes them, real Blobs, since the check of a
    written compares its numBytes with the size of its file: one of the
    3,594 bytes client.md gives, the smallest file of writeVariants.md
    with popnei's js-v0.1.0-dev.2 (3,682 with js-v0.1.0-dev.3, a size
    the client never reads), and one a byte
    larger than WRITE_RESTART_BYTES, about 3 ms to make in node. */
const SMALL_FILE = new Blob([new Uint8Array(3_594)]);
const LARGE_FILE = new Blob([new Uint8Array(WRITE_RESTART_BYTES + 1)]);

function writtenResult(file: Blob): Written<Blob> {
  return {
    format: "nei",
    file,
    numBytes: file.size,
    passStats: RESULT.passStats,
  };
}

function writtenOf(id: number, key: string, file: Blob): unknown {
  return { kind: "written", id, key, result: writtenResult(file) };
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

  test("a run on a load read before, while the worker holds another, ends the worker, opens that load's File on a new one, then runs", () => {
    const env = withA();
    env.client.addFile("B", FILE_B);
    env.client.openVariants({ fileId: "B", ...NEI });
    const second = last(env.calculation);
    emit(second, READY);
    emit(second, opened(lastSent(second).id));

    const run = env.client.run("k1", job("A"), noProgress);
    expect(second.terminated).toBe(true);
    expect(env.calculation).toHaveLength(3);
    const third = last(env.calculation);
    emit(third, READY);
    const open = lastSent(third);
    expect(open).toMatchObject({ kind: "open", fileId: "A" });
    expect(open.kind === "open" && open.file).toBe(FILE_A);
    emit(third, opened(open.id));
    expect(lastSent(third)).toMatchObject({
      kind: "run",
      id: run.id,
      key: "k1",
    });
  });

  test("addFile of a load id the client already holds is a defect, thrown", () => {
    const env = withA();
    expect(() => {
      env.client.addFile("A", FILE_B);
    }).toThrow("popnei_web defect");
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

  test("a first open that ends reopenFailed fails the read with it, the name of the file and the browser's message", async () => {
    const env = setUp();
    const first = last(env.calculation);
    env.client.addFile("A", FILE_A);
    const readA = env.client.openVariants({ fileId: "A", ...NEI });
    emit(first, READY);
    emit(first, {
      kind: "reopenFailed",
      id: lastSent(first).id,
      name: "panel.nei",
      message: "the file was changed on the disk",
    });
    expect(await now(readA.outcome)).toEqual({
      kind: "failed",
      error: {
        kind: "reopenFailed",
        name: "panel.nei",
        message: "the file was changed on the disk",
      },
    });
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

  test("an onProgress that throws: the throw reaches the caller, and the run and the queue go on", async () => {
    const env = withA();
    const r1 = env.client.run("r1", job("A"), () => {
      throw new Error("a screen failed");
    });
    const r2 = env.client.run("r2", job("A"), noProgress);
    expect(() => {
      emit(env.first, {
        kind: "progress",
        id: r1.id,
        bytesRead: 1,
        numBytes: 2,
        pass: 1,
        numPasses: 1,
      });
    }).toThrow("a screen failed");
    expect(env.first.terminated).toBe(false);
    emit(env.first, resultOf(r1.id, "r1"));
    expect(await now(r1.outcome)).toMatchObject({ kind: "done", key: "r1" });
    expect(lastSent(env.first)).toMatchObject({ kind: "run", id: r2.id });
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

  test("stop C 6 a defect of ours thrown in the calculation worker, crashed with its message, fails the run as a defect, not as workerFailed, written whole to the console, and the worker is started again", async () => {
    const env = twoRuns();
    const console_ = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const message =
      "popnei_web defect: popnei gave 10 projections for 3 individuals and 2 components";
    emit(env.first, { kind: "crashed", message });
    expect(await now(env.r1.outcome)).toEqual({
      kind: "failed",
      error: {
        kind: "defect",
        message:
          "popnei gave 10 projections for 3 individuals and 2 components",
      },
    });
    expect(console_).toHaveBeenCalledWith(
      `popnei_web: the calculation worker stopped. ${message}`,
    );
    expectRestartedWithR2(env);
  });

  test("stop A 9 popnei's refusal of an option it does not know, as the runner answers it, fails the run as a defect with popnei's message, and not as popnei's refusal", async () => {
    const env = twoRuns();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const popneis =
      "popnei: `numCompsKept` is not an option of `doPcoaFromVariants`, whose options are `minNumSnps` and `correctByLingoes`";
    const answer = answerOfThrown(new Error(popneis));
    if (answer.kind !== "crashed") {
      throw new Error(`the runner answered ${answer.kind}, not crashed`);
    }
    emit(env.first, answer);
    expect(await now(env.r1.outcome)).toEqual({
      kind: "failed",
      error: { kind: "defect", message: popneis },
    });
    expectRestartedWithR2(env);
  });

  test("an error event: the run fails as workerFailed, the event is stopped, and the worker is started again", async () => {
    const env = twoRuns();
    const event = new ErrorEvent("error", {
      message: "unreachable executed",
      cancelable: true,
    });
    env.first.onerror?.(event);
    expect(event.defaultPrevented).toBe(true);
    expect(await now(env.r1.outcome)).toEqual({
      kind: "failed",
      error: { kind: "workerFailed", message: "unreachable executed" },
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
    [
      "a result of another analysis than its job's",
      () => ({
        kind: "result",
        id: 2,
        key: "r1",
        result: { analysis: "filterCounts", passStats: RESULT.passStats },
      }),
    ],
    [
      "a refused of another request's id",
      () => ({ kind: "refused", id: 99, message: "the pass gave no variant" }),
    ],
    [
      "a reopenFailed of another request's id",
      () => ({
        kind: "reopenFailed",
        id: 99,
        name: "panel.nei",
        message: "short",
      }),
    ],
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

  test("a ready of protocol 3, stage 4's, fails every request with protocolMismatch, and no other worker is made", async () => {
    const env = setUp();
    env.client.addFile("A", FILE_A);
    const readA = env.client.openVariants({ fileId: "A", ...NEI });
    emit(last(env.calculation), { kind: "ready", protocol: 3 });
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

// The properties: fast-check draws sequences of reads, runs, writes,
// cancels, answers, crashes and timeouts in any order, and each property
// is checked on what the client did with them.

/** One step of a sequence the properties draw. */
type Step =
  /** A new variants file picked, and its read asked for. */
  | { readonly kind: "pick" }
  /** The read of a load picked before asked for again. */
  | { readonly kind: "reread"; readonly load: number }
  /** A run on a load picked before. */
  | { readonly kind: "run"; readonly load: number }
  /** A write on a load picked before, whose file is larger than
      WRITE_RESTART_BYTES when `large`. */
  | { readonly kind: "write"; readonly load: number; readonly large: boolean }
  /** A read of the individuals file. */
  | { readonly kind: "individuals" }
  /** A cancel of a request made before. */
  | { readonly kind: "cancel"; readonly request: number }
  /** The calculation worker gives its ready, or answers what it runs:
      0 and 1 the answer that goes right, 2 refused, 3 reopenFailed, and
      1 a progress for a run or a write. */
  | { readonly kind: "answer"; readonly how: number }
  /** The light worker gives its ready, or answers its read: 0 a table,
      1 a file refused. */
  | { readonly kind: "answerLight"; readonly how: number }
  /** The calculation worker fails: 0 crashed, 1 an error event,
      2 messageerror, 3 badRequest, 4 a message that fails its check. */
  | { readonly kind: "crash"; readonly how: number }
  /** The light worker crashes. */
  | { readonly kind: "crashLight" }
  /** 30 seconds go by. */
  | { readonly kind: "timeout" }
  /** A worker ended before posts an answer. */
  | { readonly kind: "stale"; readonly worker: number }
  /** The calculation worker gives a ready of another version, when
      `chance` is 0 of 0 to 9, since it ends every request after it. */
  | { readonly kind: "otherBuild"; readonly chance: number };

const step: fc.Arbitrary<Step> = fc.oneof(
  { weight: 3, arbitrary: fc.constant({ kind: "pick" as const }) },
  {
    weight: 1,
    arbitrary: fc.record({
      kind: fc.constant("reread" as const),
      load: fc.nat(),
    }),
  },
  {
    weight: 4,
    arbitrary: fc.record({ kind: fc.constant("run" as const), load: fc.nat() }),
  },
  {
    weight: 2,
    arbitrary: fc.record({
      kind: fc.constant("write" as const),
      load: fc.nat(),
      large: fc.boolean(),
    }),
  },
  { weight: 1, arbitrary: fc.constant({ kind: "individuals" as const }) },
  {
    weight: 3,
    arbitrary: fc.record({
      kind: fc.constant("cancel" as const),
      request: fc.nat(),
    }),
  },
  {
    weight: 16,
    arbitrary: fc.record({
      kind: fc.constant("answer" as const),
      how: fc.nat({ max: 3 }),
    }),
  },
  {
    weight: 2,
    arbitrary: fc.record({
      kind: fc.constant("answerLight" as const),
      how: fc.nat({ max: 1 }),
    }),
  },
  {
    weight: 2,
    arbitrary: fc.record({
      kind: fc.constant("crash" as const),
      how: fc.nat({ max: 4 }),
    }),
  },
  { weight: 1, arbitrary: fc.constant({ kind: "crashLight" as const }) },
  { weight: 1, arbitrary: fc.constant({ kind: "timeout" as const }) },
  {
    weight: 1,
    arbitrary: fc.record({
      kind: fc.constant("stale" as const),
      worker: fc.nat(),
    }),
  },
  {
    weight: 1,
    arbitrary: fc.record({
      kind: fc.constant("otherBuild" as const),
      chance: fc.nat({ max: 9 }),
    }),
  },
);

const steps = fc.array(step, { maxLength: 60, size: "max" });

/** A worker as the properties watch it. */
interface Watched {
  readonly fake: FakeWorker;
  readonly role: "calculation" | "light";
  readySent: boolean;
  /** The request it was sent and has not answered. */
  pending: ToRunner | ToFilesRunner | null;
  /** The load of its open, the first request of a calculation worker. */
  openLoad: string | null;
  numPosts: number;
  /** The handler the client set on it, kept from its ready, through
      which a message it posted before it was ended can still arrive. */
  handler: ((event: { readonly data: unknown }) => unknown) | null;
}

/** What a sequence showed, one list per property of what broke it. */
interface Seen {
  /** Requests whose outcome did not come exactly once, after every worker
      answered what it was left with. */
  readonly notAnsweredOnce: string[];
  /** A request sent before the ready, or a second before the answer. */
  readonly outOfOrder: string[];
  /** A request sent to a worker that was ended. */
  readonly afterEnd: string[];
  /** An answer of a calculation worker given before its onPopneiReady. */
  readonly beforeReady: string[];
  /** A second open, or a request of another load than the open's. */
  readonly wrongLoad: string[];
  /** An answer that is not the one its worker gave for its request. */
  readonly wrongAnswer: string[];
  /** A worker not ended after a large write or a refused one, or ended
      after a small one. */
  readonly wrongRestart: string[];
}

function watch(role: Watched["role"], seen: Seen): Watched {
  const fake = fakeWorker();
  const watched: Watched = {
    fake,
    role,
    readySent: false,
    pending: null,
    openLoad: null,
    numPosts: 0,
    handler: null,
  };
  const post = fake.postMessage;
  fake.postMessage = (message) => {
    if (fake.terminated) {
      seen.afterEnd.push(`${role} worker sent ${JSON.stringify(message)}`);
    }
    if (!watched.readySent) {
      seen.outOfOrder.push(`${role} worker sent a request before its ready`);
    }
    if (watched.pending !== null) {
      seen.outOfOrder.push(
        `${role} worker sent a second request before the answer`,
      );
    }
    if (role === "calculation") {
      const request = parseToRunner(message);
      if (!request.ok) {
        throw new Error("the client sent a wrong request");
      }
      const sent = request.value;
      switch (sent.kind) {
        case "open":
          if (watched.numPosts > 0) {
            seen.wrongLoad.push(`a second open, of ${sent.fileId}`);
          }
          watched.openLoad = sent.fileId;
          break;
        case "run":
        case "write":
          if (watched.numPosts === 0) {
            seen.wrongLoad.push(`a ${sent.kind} as the first request`);
          } else if (sent.job.fileId !== watched.openLoad) {
            seen.wrongLoad.push(
              `a ${sent.kind} of ${sent.job.fileId} to a worker that opened ${String(watched.openLoad)}`,
            );
          }
          break;
      }
      watched.pending = sent;
    } else {
      const request = parseToFilesRunner(message);
      if (!request.ok) {
        throw new Error("the client sent a wrong request");
      }
      watched.pending = request.value;
    }
    watched.numPosts += 1;
    post(message);
  };
  return watched;
}

/** Lets the outcomes resolved by the last step reach their callbacks. */
async function flush(): Promise<void> {
  for (let tick = 0; tick < 5; tick += 1) {
    await Promise.resolve();
  }
}

/** Whether an answer of a calculation request came from its worker, and
    not from the client alone. */
function fromWorker(
  answer: VariantsOpened | Outcome<JobResult> | Outcome<Written<Blob>>,
): boolean {
  switch (answer.kind) {
    case "opened":
    case "done":
      return true;
    case "failed":
      return (
        answer.error.kind === "popnei" || answer.error.kind === "reopenFailed"
      );
    case "cancelled":
      return false;
  }
}

/** A request as the properties know it, to check its answer. */
type Asked =
  | { readonly kind: "read"; readonly fileId: string }
  | {
      readonly kind: "run" | "write";
      readonly id: number;
      readonly key: string;
    }
  | { readonly kind: "light" };

/** An opened whose first individual is the load of its open. */
function stampedOpened(id: number, fileId: string): unknown {
  return { kind: "opened", id, individuals: [fileId], ploidy: 2 };
}

/** A result whose numVars is `stamp`, the id of its run. */
function stampedResult(id: number, key: string, stamp: number): unknown {
  const passStats = { ...RESULT.passStats, numVars: stamp };
  return { kind: "result", id, key, result: { ...RESULT, passStats } };
}

/** A written whose numVars is `stamp`, the id of its write, and whose
    file is larger than WRITE_RESTART_BYTES when the key ends in "L". */
function stampedWritten(id: number, key: string, stamp: number): unknown {
  const file = key.endsWith("L") ? LARGE_FILE : SMALL_FILE;
  return {
    kind: "written",
    id,
    key,
    result: {
      ...writtenResult(file),
      passStats: { ...RESULT.passStats, numVars: stamp },
    },
  };
}

/** Runs a sequence on a client over watched workers, then has every
    worker answer what it is left with until nothing is left, and gives
    what each property saw. */
async function explore(sequence: readonly Step[]): Promise<Seen> {
  const seen: Seen = {
    notAnsweredOnce: [],
    outOfOrder: [],
    afterEnd: [],
    beforeReady: [],
    wrongLoad: [],
    wrongAnswer: [],
    wrongRestart: [],
  };
  const calculation: Watched[] = [];
  const light: Watched[] = [];
  // The client writes a second answer of a request to the console.
  const consoleError = vi
    .spyOn(console, "error")
    .mockImplementation(() => undefined);
  const errorsBefore = consoleError.mock.calls.length;
  /** The calculation worker whose message is being delivered, or the
      last one made, which the answers of the step are put to. */
  let stepWorker = -1;
  const announced = new Set<number>();
  const client = createClient({
    calculation: () => {
      const watched = watch("calculation", seen);
      calculation.push(watched);
      return watched.fake;
    },
    light: () => {
      const watched = watch("light", seen);
      light.push(watched);
      return watched.fake;
    },
    onPopneiReady: () => {
      announced.add(stepWorker);
    },
  });
  const loads: string[] = [];
  const counts: number[] = [];
  const cancels: (() => void)[] = [];
  client.addFile("ind", CSV_FILE);

  function track(
    outcome: Promise<
      | VariantsOpened
      | Outcome<JobResult>
      | Outcome<Written<Blob>>
      | IndividualsAnswer
    >,
    request: Asked,
  ): void {
    const index = counts.length;
    counts.push(0);
    void outcome.then((answer) => {
      counts[index] = (counts[index] ?? 0) + 1;
      // The workers stamp an opened with the load of its open, and a
      // result or a written with the id of its run or write.
      if (
        answer.kind === "opened" &&
        request.kind === "read" &&
        answer.individuals[0] !== request.fileId
      ) {
        seen.wrongAnswer.push(
          `the read of ${request.fileId} got the individuals of ${String(answer.individuals[0])}`,
        );
      }
      if (
        answer.kind === "done" &&
        (request.kind === "run" || request.kind === "write") &&
        (answer.key !== request.key ||
          answer.result.passStats.numVars !== request.id ||
          "file" in answer.result !== (request.kind === "write"))
      ) {
        seen.wrongAnswer.push(
          `the ${request.kind} ${String(request.id)} of ${request.key} got the answer of ${String(answer.result.passStats.numVars)} under ${answer.key}`,
        );
      }
      if (
        request.kind !== "light" &&
        answer.kind !== "read" &&
        answer.kind !== "refused" &&
        fromWorker(answer) &&
        !announced.has(stepWorker)
      ) {
        seen.beforeReady.push(
          `an answer ${answer.kind} of worker ${String(stepWorker)} before its onPopneiReady`,
        );
      }
    });
  }

  function deliver(index: number, data: unknown): void {
    const watched = calculation[index];
    if (watched === undefined) {
      return;
    }
    stepWorker = index;
    emit(watched.fake, data);
  }

  /** The calculation worker answers: its ready, or what it runs. */
  function answerCalculation(how: number): void {
    const index = calculation.length - 1;
    const watched = calculation[index];
    if (watched === undefined || watched.fake.terminated) {
      return;
    }
    if (!watched.readySent) {
      watched.readySent = true;
      watched.handler = watched.fake.onmessage;
      deliver(index, READY);
      return;
    }
    const pending = watched.pending;
    if (pending === null || pending.kind === "readIndividuals") {
      return;
    }
    if ((pending.kind === "run" || pending.kind === "write") && how === 1) {
      deliver(index, {
        kind: "progress",
        id: pending.id,
        bytesRead: 10,
        numBytes: 20,
        pass: 1,
        numPasses: 1,
      });
      return;
    }
    watched.pending = null;
    if (how === 2) {
      deliver(index, { kind: "refused", id: pending.id, message: "refused" });
      if (pending.kind === "write") {
        expectEnded(watched, true, `the write ${pending.key} refused`);
      }
      return;
    }
    if (how === 3) {
      deliver(index, {
        kind: "reopenFailed",
        id: pending.id,
        name: "f.nei",
        message: "short",
      });
      if (pending.kind === "write") {
        expectEnded(watched, false, `the write ${pending.key} reopenFailed`);
      }
      return;
    }
    switch (pending.kind) {
      case "open":
        deliver(index, stampedOpened(pending.id, pending.fileId));
        return;
      case "run":
        deliver(index, stampedResult(pending.id, pending.key, pending.id));
        return;
      case "write":
        deliver(index, stampedWritten(pending.id, pending.key, pending.id));
        expectEnded(
          watched,
          pending.key.endsWith("L"),
          `the write ${pending.key} written`,
        );
        return;
    }
  }

  /** After the answer of a write, its worker was ended or not, as `ended`
      says it should be. */
  function expectEnded(watched: Watched, ended: boolean, what: string): void {
    if (watched.fake.terminated !== ended) {
      seen.wrongRestart.push(
        `after ${what} the worker was ${watched.fake.terminated ? "" : "not "}ended`,
      );
    }
  }

  /** The light worker answers: its ready, or its read. */
  function answerLight(how: number): void {
    const watched = light.at(-1);
    if (watched === undefined || watched.fake.terminated) {
      return;
    }
    if (!watched.readySent) {
      watched.readySent = true;
      emit(watched.fake, LIGHT_READY);
      return;
    }
    const pending = watched.pending;
    if (pending === null) {
      return;
    }
    watched.pending = null;
    emit(watched.fake, {
      kind: "individuals",
      id: pending.id,
      read:
        how === 0 ? TABLE_READ : { kind: "failed", error: { kind: "empty" } },
    });
  }

  function crashCalculation(how: number): void {
    const index = calculation.length - 1;
    const watched = calculation[index];
    if (watched === undefined) {
      return;
    }
    stepWorker = index;
    switch (how) {
      case 0:
        emit(watched.fake, { kind: "crashed", message: "trap" });
        return;
      case 1:
        watched.fake.onerror?.(new ErrorEvent("error", { message: "error" }));
        return;
      case 2:
        watched.fake.onmessageerror?.({ data: null });
        return;
      case 3:
        emit(watched.fake, { kind: "badRequest", message: "wrong" });
        return;
      default:
        emit(watched.fake, { kind: "nonsense" });
    }
  }

  for (const next of sequence) {
    stepWorker = calculation.length - 1;
    switch (next.kind) {
      case "pick": {
        const load = `L${String(loads.length)}`;
        loads.push(load);
        client.addFile(load, new File([load], `${load}.nei`));
        const read = client.openVariants({ fileId: load, ...NEI });
        track(read.outcome, { kind: "read", fileId: load });
        cancels.push(() => {
          read.cancel();
        });
        break;
      }
      case "reread": {
        const load = loads[next.load % Math.max(loads.length, 1)];
        if (load !== undefined) {
          const read = client.openVariants({ fileId: load, ...NEI });
          track(read.outcome, { kind: "read", fileId: load });
          cancels.push(() => {
            read.cancel();
          });
        }
        break;
      }
      case "run": {
        const load = loads[next.load % Math.max(loads.length, 1)] ?? "none";
        const key = `k${String(counts.length)}`;
        const run = client.run(key, job(load), noProgress);
        track(run.outcome, { kind: "run", id: run.id, key });
        cancels.push(() => {
          run.cancel();
        });
        break;
      }
      case "write": {
        const load = loads[next.load % Math.max(loads.length, 1)] ?? "none";
        const key = `w${String(counts.length)}${next.large ? "L" : ""}`;
        const write = client.write(key, writeJob(load), noProgress);
        track(write.outcome, { kind: "write", id: write.id, key });
        cancels.push(() => {
          write.cancel();
        });
        break;
      }
      case "individuals": {
        const read = client.readIndividuals("ind", CSV);
        track(read.outcome, { kind: "light" });
        cancels.push(() => {
          read.cancel();
        });
        break;
      }
      case "cancel":
        cancels[next.request % Math.max(cancels.length, 1)]?.();
        break;
      case "answer":
        answerCalculation(next.how);
        break;
      case "answerLight":
        answerLight(next.how);
        break;
      case "crash":
        crashCalculation(next.how);
        break;
      case "crashLight": {
        const watched = light.at(-1);
        if (watched !== undefined) {
          emit(watched.fake, { kind: "crashed", message: "trap" });
        }
        break;
      }
      case "timeout":
        vi.advanceTimersByTime(WORKER_READY_TIMEOUT_MS);
        break;
      case "stale": {
        const ended = calculation.filter((watched) => watched.fake.terminated);
        const watched = ended[next.worker % Math.max(ended.length, 1)];
        const pending = calculation.at(-1)?.pending ?? null;
        const handler = watched?.handler ?? null;
        if (handler !== null && pending !== null) {
          // What the ended worker posted before its end, of the id the
          // current worker runs, through the handler the client set on it.
          stepWorker = calculation.findIndex(
            (other) => other.handler === handler,
          );
          switch (pending.kind) {
            case "open":
              handler({ data: stampedOpened(pending.id, "stale") });
              break;
            case "run":
              handler({
                data: stampedResult(pending.id, pending.key, -1),
              });
              break;
            case "write":
              handler({
                data: stampedWritten(pending.id, pending.key, -1),
              });
              break;
            case "readIndividuals":
              break;
          }
        }
        break;
      }
      case "otherBuild": {
        const index = calculation.length - 1;
        const watched = calculation[index];
        if (watched !== undefined && !watched.readySent && next.chance === 0) {
          deliver(index, { kind: "ready", protocol: 3 });
        }
        break;
      }
    }
    await flush();
  }

  // Every worker answers what it is left with, rightly, until nothing is.
  for (let round = 0; round < 200; round += 1) {
    if (counts.every((count) => count > 0)) {
      break;
    }
    answerCalculation(0);
    answerLight(0);
    await flush();
  }
  for (const call of consoleError.mock.calls.slice(errorsBefore)) {
    const text: unknown = call[0];
    if (
      typeof text === "string" &&
      text.startsWith("popnei_web defect: a request answered twice")
    ) {
      seen.notAnsweredOnce.push(text);
    }
  }
  for (const [index, count] of counts.entries()) {
    if (count !== 1) {
      seen.notAnsweredOnce.push(
        `request ${String(index)} answered ${String(count)} times`,
      );
    }
  }
  return seen;
}

describe("WS2 D4 the properties of the client", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test("every request gets its answer or outcome exactly once", async () => {
    await fc.assert(
      fc.asyncProperty(steps, async (sequence) => {
        expect((await explore(sequence)).notAnsweredOnce).toEqual([]);
      }),
    );
  });

  test("a worker is never sent a request before its ready, nor a second one before the answer to the first", async () => {
    await fc.assert(
      fc.asyncProperty(steps, async (sequence) => {
        expect((await explore(sequence)).outOfOrder).toEqual([]);
      }),
    );
  });

  test("a worker that was ended is sent nothing more", async () => {
    await fc.assert(
      fc.asyncProperty(steps, async (sequence) => {
        expect((await explore(sequence)).afterEnd).toEqual([]);
      }),
    );
  });

  test("onPopneiReady comes before any answer of its worker is given to a caller", async () => {
    await fc.assert(
      fc.asyncProperty(steps, async (sequence) => {
        expect((await explore(sequence)).beforeReady).toEqual([]);
      }),
    );
  });

  test("no worker is sent a second open, nor a request of another load than its open's", async () => {
    await fc.assert(
      fc.asyncProperty(steps, async (sequence) => {
        expect((await explore(sequence)).wrongLoad).toEqual([]);
      }),
    );
  });

  test("every answer is the one its worker gave for its request", async () => {
    await fc.assert(
      fc.asyncProperty(steps, async (sequence) => {
        expect((await explore(sequence)).wrongAnswer).toEqual([]);
      }),
    );
  });
});

describe("VS1 D5 the write of the client: the properties", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test("the worker is ended after a write larger than WRITE_RESTART_BYTES or refused, and not after a smaller one", async () => {
    await fc.assert(
      fc.asyncProperty(steps, async (sequence) => {
        expect((await explore(sequence)).wrongRestart).toEqual([]);
      }),
    );
  });
});

describe("WS2 D3 the client: what the review of work package 2 found", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test("a worker that crashes idle after each reopen with nothing waiting, twice, is given up", () => {
    const env = withA();
    for (let round = 0; round < 6; round += 1) {
      const worker = last(env.calculation);
      if (worker.terminated) {
        break;
      }
      emit(worker, { kind: "crashed", message: "trap" });
      const next = last(env.calculation);
      if (next.terminated || next === worker) {
        break;
      }
      emit(next, READY);
      emit(next, opened(lastSent(next).id));
    }
    expect(env.calculation).toHaveLength(2);
  });

  test("a calculation worker whose script does not load, a plain error Event, twice: couldNotStart with the client's words", async () => {
    const env = setUp();
    env.client.addFile("A", FILE_A);
    const readA = env.client.openVariants({ fileId: "A", ...NEI });
    const first = new Event("error", { cancelable: true });
    last(env.calculation).onerror?.(first);
    expect(first.defaultPrevented).toBe(true);
    last(env.calculation).onerror?.(new Event("error", { cancelable: true }));
    expect(await now(readA.outcome)).toEqual({
      kind: "failed",
      error: {
        kind: "couldNotStart",
        reason: "the worker stopped with no message",
      },
    });
  });

  test("a light worker whose script does not load, a plain error Event, twice: couldNotStart with the client's words", async () => {
    const env = setUp();
    env.client.addFile("ind", CSV_FILE);
    const read = env.client.readIndividuals("ind", CSV);
    last(env.light).onerror?.(new Event("error", { cancelable: true }));
    last(env.light).onerror?.(new Event("error", { cancelable: true }));
    expect(await now(read.outcome)).toEqual({
      kind: "failed",
      error: {
        kind: "couldNotStart",
        reason: "the worker stopped with no message",
      },
    });
    expect(env.light).toHaveLength(2);
  });

  test("a read waiting on an open sent for a run gets reopenFailed when that open is refused", async () => {
    const env = withA();
    env.client.run("k1", job("A"), noProgress).cancel();
    const second = last(env.calculation);
    env.client.run("k2", job("A"), noProgress);
    emit(second, READY);
    const openId = lastSent(second).id;
    const read = env.client.openVariants({ fileId: "A", ...NEI });
    emit(second, { kind: "refused", id: openId, message: "not a vars file" });
    expect(await now(read.outcome)).toEqual({
      kind: "failed",
      error: {
        kind: "reopenFailed",
        name: "panel.nei",
        message: "not a vars file",
      },
    });
  });
});

describe("WS2 D3 the client: crashes, defects, and every read answered, on the light worker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  /** Two reads of the individuals file, the first sent to a ready light
      worker, the second waiting. */
  function twoReads(): ReturnType<typeof setUp> & {
    readonly worker: FakeWorker;
    readonly first: ReturnType<
      ReturnType<typeof createClient>["readIndividuals"]
    >;
    readonly second: ReturnType<
      ReturnType<typeof createClient>["readIndividuals"]
    >;
  } {
    const env = setUp();
    env.client.addFile("ind", CSV_FILE);
    const first = env.client.readIndividuals("ind", CSV);
    const second = env.client.readIndividuals("ind", CSV);
    const worker = last(env.light);
    emit(worker, LIGHT_READY);
    expect(sentToLight(worker)).toHaveLength(1);
    return { ...env, worker, first, second };
  }

  test.each([
    [
      "crashed",
      (worker: FakeWorker) => {
        emit(worker, { kind: "crashed", message: "trap" });
      },
      { kind: "workerFailed", message: "trap" },
    ],
    [
      "badRequest",
      (worker: FakeWorker) => {
        emit(worker, { kind: "badRequest", message: "wrong" });
      },
      { kind: "defect", message: "wrong" },
    ],
    [
      "an error event",
      (worker: FakeWorker) => {
        worker.onerror?.(new ErrorEvent("error", { message: "boom" }));
      },
      { kind: "workerFailed", message: "boom" },
    ],
    [
      "messageerror",
      (worker: FakeWorker) => {
        worker.onmessageerror?.({ data: null });
      },
      { kind: "workerFailed" },
    ],
    [
      "a message that fails its check",
      (worker: FakeWorker) => {
        emit(worker, { kind: "individuals", id: 1 });
      },
      { kind: "defect" },
    ],
  ])(
    "%s: the read fails, the worker is started again and given the read that waited",
    async (_name, fail, error) => {
      const env = twoReads();
      fail(env.worker);
      expect(await now(env.first.outcome)).toMatchObject({
        kind: "failed",
        error,
      });
      expect(env.worker.terminated).toBe(true);
      expect(env.worker.endedWithHandlers).toBe(false);
      const next = last(env.light);
      expect(env.light).toHaveLength(2);
      emit(next, LIGHT_READY);
      const sent = sentToLight(next);
      expect(sent).toHaveLength(1);
      emit(env.worker, { kind: "individuals", id: 1, read: TABLE_READ });
      emit(next, { kind: "individuals", id: sent[0]?.id, read: TABLE_READ });
      expect(await now(env.second.outcome)).toEqual(TABLE_READ);
      expect(env.light).toHaveLength(2);
    },
  );

  test("a postMessage that throws: the read fails as a defect with the browser's message, and the worker is started again", async () => {
    const env = setUp();
    env.client.addFile("ind", CSV_FILE);
    const read = env.client.readIndividuals("ind", CSV);
    const worker = last(env.light);
    worker.postError = new Error("The object could not be cloned.");
    emit(worker, LIGHT_READY);
    expect(await now(read.outcome)).toEqual({
      kind: "failed",
      error: { kind: "defect", message: "The object could not be cloned." },
    });
    expect(worker.terminated).toBe(true);
    expect(env.light).toHaveLength(2);
  });

  test("no ready twice gives the light worker up: every read fails, a read after it too", async () => {
    const env = setUp();
    env.client.addFile("ind", CSV_FILE);
    const read = env.client.readIndividuals("ind", CSV);
    vi.advanceTimersByTime(WORKER_READY_TIMEOUT_MS);
    expect(env.light).toHaveLength(2);
    vi.advanceTimersByTime(WORKER_READY_TIMEOUT_MS);
    expect(await now(read.outcome)).toMatchObject({
      kind: "failed",
      error: { kind: "couldNotStart" },
    });
    const after = env.client.readIndividuals("ind", CSV);
    expect(await now(after.outcome)).toMatchObject({
      kind: "failed",
      error: { kind: "couldNotStart" },
    });
    expect(env.light).toHaveLength(2);
  });

  test("a ready of protocol 3, stage 4's, fails every read with protocolMismatch, and no other light worker is made", async () => {
    const env = setUp();
    env.client.addFile("ind", CSV_FILE);
    const read = env.client.readIndividuals("ind", CSV);
    emit(last(env.light), { kind: "ready", protocol: 3 });
    expect(await now(read.outcome)).toEqual({
      kind: "failed",
      error: { kind: "protocolMismatch" },
    });
    const after = env.client.readIndividuals("ind", CSV);
    expect(await now(after.outcome)).toEqual({
      kind: "failed",
      error: { kind: "protocolMismatch" },
    });
    vi.advanceTimersByTime(3 * WORKER_READY_TIMEOUT_MS);
    expect(env.light).toHaveLength(1);
  });
});

describe("WS2 D3 the client: what the test review found", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  /** Load A read, then the idle worker crashes once: the count of
      failures is 1, and the worker started again has opened A with
      nothing waiting, which does not set the count back. */
  function crashedOnce(): ReturnType<typeof withA> & {
    readonly second: FakeWorker;
  } {
    const env = withA();
    emit(env.first, { kind: "crashed", message: "trap" });
    const second = last(env.calculation);
    emit(second, READY);
    emit(second, opened(lastSent(second).id));
    return { ...env, second };
  }

  test("the ready stops the timer: 65 seconds after it, one worker, and its read still under way", async () => {
    const env = setUp();
    env.client.addFile("A", FILE_A);
    const readA = env.client.openVariants({ fileId: "A", ...NEI });
    emit(last(env.calculation), READY);
    vi.advanceTimersByTime(65_000);
    expect(env.calculation).toHaveLength(1);
    expect(last(env.calculation).terminated).toBe(false);
    expect(await now(readA.outcome)).toBe("pending");
  });

  test("a file the reader refused arrives as refused, with the reader's own error whole", async () => {
    const env = setUp();
    env.client.addFile("ind", CSV_FILE);
    const read = env.client.readIndividuals("ind", CSV);
    const worker = last(env.light);
    emit(worker, LIGHT_READY);
    const error = {
      kind: "raggedRow",
      line: 3,
      expected: 4,
      found: 3,
      separator: ";",
    };
    emit(worker, {
      kind: "individuals",
      id: sentToLight(worker)[0]?.id,
      read: { kind: "failed", error },
    });
    expect(await now(read.outcome)).toEqual({ kind: "refused", error });
  });

  test("a run refused sets the count of failures back: one more idle crash starts the worker again", () => {
    const env = crashedOnce();
    const run = env.client.run("k1", job("A"), noProgress);
    emit(env.second, { kind: "refused", id: run.id, message: "no variant" });
    emit(env.second, { kind: "crashed", message: "trap" });
    expect(env.calculation).toHaveLength(3);
  });

  test("a run answered with its result sets the count of failures back: one more idle crash starts the worker again", () => {
    const env = crashedOnce();
    const run = env.client.run("k1", job("A"), noProgress);
    emit(env.second, resultOf(run.id, "k1"));
    emit(env.second, { kind: "crashed", message: "trap" });
    expect(env.calculation).toHaveLength(3);
  });

  test("a read of the individuals file answered sets the count back: after one slow start, one idle crash starts the light worker again", () => {
    const env = setUp();
    env.client.addFile("ind", CSV_FILE);
    env.client.readIndividuals("ind", CSV);
    vi.advanceTimersByTime(WORKER_READY_TIMEOUT_MS);
    const second = last(env.light);
    emit(second, LIGHT_READY);
    emit(second, {
      kind: "individuals",
      id: sentToLight(second)[0]?.id,
      read: TABLE_READ,
    });
    emit(second, { kind: "crashed", message: "trap" });
    expect(env.light).toHaveLength(3);
  });

  test("a crash during an open fails the runs waiting on it, and the new worker opens nothing", async () => {
    const env = withA();
    env.client.run("k1", job("A"), noProgress).cancel();
    const second = last(env.calculation);
    const k2 = env.client.run("k2", job("A"), noProgress);
    emit(second, READY);
    expect(lastSent(second)).toMatchObject({ kind: "open", fileId: "A" });
    emit(second, { kind: "crashed", message: "trap" });
    expect(await now(k2.outcome)).toEqual({
      kind: "failed",
      error: { kind: "workerFailed", message: "trap" },
    });
    const third = last(env.calculation);
    emit(third, READY);
    expect(third.posted).toEqual([]);
  });

  test("two runs that each crash while running do not give the worker up", async () => {
    const env = withA();
    const r1 = env.client.run("r1", job("A"), noProgress);
    emit(env.first, { kind: "crashed", message: "out of memory" });
    const second = last(env.calculation);
    emit(second, READY);
    emit(second, opened(lastSent(second).id));
    const r2 = env.client.run("r2", job("A"), noProgress);
    expect(lastSent(second)).toMatchObject({ kind: "run", id: r2.id });
    emit(second, { kind: "crashed", message: "out of memory" });
    expect(await now(r1.outcome)).toMatchObject({ kind: "failed" });
    expect(await now(r2.outcome)).toMatchObject({
      kind: "failed",
      error: { kind: "workerFailed" },
    });
    expect(env.calculation).toHaveLength(3);
    const r3 = env.client.run("r3", job("A"), noProgress);
    expect(await now(r3.outcome)).toBe("pending");
  });

  test("an answer of the light worker of another id is a defect, not the answer of the read", async () => {
    const env = setUp();
    env.client.addFile("ind", CSV_FILE);
    const read = env.client.readIndividuals("ind", CSV);
    const worker = last(env.light);
    emit(worker, LIGHT_READY);
    emit(worker, { kind: "individuals", id: 99, read: TABLE_READ });
    expect(await now(read.outcome)).toMatchObject({
      kind: "failed",
      error: { kind: "defect" },
    });
    expect(worker.terminated).toBe(true);
  });

  test("a second ready of the calculation worker is a defect, and ends it", () => {
    const env = withA();
    emit(env.first, READY);
    expect(env.first.terminated).toBe(true);
    expect(env.calculation).toHaveLength(2);
  });

  test("a second ready of the light worker is a defect, and ends it", () => {
    const env = setUp();
    env.client.addFile("ind", CSV_FILE);
    env.client.readIndividuals("ind", CSV);
    const worker = last(env.light);
    emit(worker, LIGHT_READY);
    emit(worker, LIGHT_READY);
    expect(worker.terminated).toBe(true);
    expect(env.light).toHaveLength(2);
  });

  test("an error event through the handler of a worker already ended changes nothing", () => {
    const env = withA();
    const onerror = env.first.onerror;
    env.client.run("k1", job("A"), noProgress).cancel();
    const second = last(env.calculation);
    onerror?.(new ErrorEvent("error", { message: "late" }));
    expect(second.terminated).toBe(false);
    expect(env.calculation).toHaveLength(2);
  });

  test("a messageerror through the handler of a worker already ended changes nothing", () => {
    const env = withA();
    const onmessageerror = env.first.onmessageerror;
    env.client.run("k1", job("A"), noProgress).cancel();
    const second = last(env.calculation);
    onmessageerror?.({ data: null });
    expect(second.terminated).toBe(false);
    expect(env.calculation).toHaveLength(2);
  });

  test("a crash during the first open of a load fails its read, and a run on it is then a defect", async () => {
    const env = setUp();
    const first = last(env.calculation);
    env.client.addFile("A", FILE_A);
    const readA = env.client.openVariants({ fileId: "A", ...NEI });
    emit(first, READY);
    emit(first, { kind: "crashed", message: "trap" });
    expect(await now(readA.outcome)).toMatchObject({
      kind: "failed",
      error: { kind: "workerFailed" },
    });
    const run = env.client.run("k1", job("A"), noProgress);
    expect(await now(run.outcome)).toMatchObject({
      kind: "failed",
      error: { kind: "defect" },
    });
  });
});

/** Load A read, a write w1 on A running on the first worker, and a run k5
    waiting behind it. */
function writeAndRun(): ReturnType<typeof withA> & {
  readonly w1: ReturnType<ReturnType<typeof createClient>["write"]>;
  readonly k5: ReturnType<ReturnType<typeof createClient>["run"]>;
} {
  const env = withA();
  const w1 = env.client.write("w1", writeJob("A"), noProgress);
  const k5 = env.client.run("k5", job("A"), noProgress);
  expect(lastSent(env.first)).toMatchObject({ kind: "write", key: "w1" });
  return { ...env, w1, k5 };
}

/** The worker after a restart that follows a write: once ready it is sent
    the open of A with its File, onPopneiReady is called only when that
    open ends, and then k5 is sent. */
function expectReopenedThenK5(env: ReturnType<typeof writeAndRun>): void {
  expect(env.first.terminated).toBe(true);
  expect(env.first.endedWithHandlers).toBe(false);
  expect(env.calculation).toHaveLength(2);
  const second = last(env.calculation);
  expect(env.versions).toEqual(["0.1.0"]);
  emit(second, READY);
  const open = lastSent(second);
  expect(open).toMatchObject({ kind: "open", fileId: "A" });
  expect(open.kind === "open" && open.file).toBe(FILE_A);
  expect(env.versions).toEqual(["0.1.0"]);
  emit(second, opened(open.id));
  expect(env.versions).toEqual(["0.1.0", "0.1.0"]);
  expect(lastSent(second)).toMatchObject({
    kind: "run",
    id: env.k5.id,
    key: "k5",
  });
  expect(second.posted).toHaveLength(2);
}

/** The file of a done outcome, or null. */
function fileOf(outcome: Outcome<Written<Blob>> | "pending"): Blob | null {
  return outcome !== "pending" && outcome.kind === "done"
    ? outcome.result.file
    : null;
}

describe("VS1 D5 the write of the client: a write", () => {
  test("a write is sent with its key and job; its progress reaches onProgress, and its outcome is done with the very Blob, the worker not ended", async () => {
    const env = withA();
    const progress: Progress[] = [];
    const w1 = env.client.write("w1", writeJob("A"), (p) => {
      progress.push(p);
    });
    expect(lastSent(env.first)).toEqual({
      kind: "write",
      id: w1.id,
      key: "w1",
      job: writeJob("A"),
    });
    const first = {
      bytesRead: 100,
      numBytes: 19_161_178,
      pass: 1,
      numPasses: 1,
    };
    const second = { ...first, bytesRead: 19_161_178 };
    emit(env.first, { kind: "progress", id: w1.id, ...first });
    emit(env.first, { kind: "progress", id: w1.id, ...second });
    expect(progress).toEqual([first, second]);
    emit(env.first, writtenOf(w1.id, "w1", SMALL_FILE));
    const outcome = await now(w1.outcome);
    expect(outcome).toEqual({
      kind: "done",
      key: "w1",
      result: writtenResult(SMALL_FILE),
    });
    expect(fileOf(outcome)).toBe(SMALL_FILE);
    expect(SMALL_FILE.size).toBe(3_594);
    expect(env.first.terminated).toBe(false);
    expect(env.calculation).toHaveLength(1);
  });

  test("a write waits behind a run, and a run behind a write, in the one queue", async () => {
    const env = withA();
    const k1 = env.client.run("k1", job("A"), noProgress);
    const w1 = env.client.write("w1", writeJob("A"), noProgress);
    const k2 = env.client.run("k2", job("A"), noProgress);
    expect(lastSent(env.first)).toMatchObject({ kind: "run", key: "k1" });
    emit(env.first, resultOf(k1.id, "k1"));
    expect(lastSent(env.first)).toMatchObject({ kind: "write", key: "w1" });
    emit(env.first, writtenOf(w1.id, "w1", SMALL_FILE));
    expect(await now(w1.outcome)).toMatchObject({ kind: "done", key: "w1" });
    expect(lastSent(env.first)).toMatchObject({ kind: "run", id: k2.id });
  });
});

describe("VS1 D5 the write of the client: the wrong answers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test.each([
    [
      "a written under another key than its write's",
      (env: ReturnType<typeof writeAndRun>) =>
        writtenOf(env.w1.id, "w9", SMALL_FILE),
    ],
    [
      "a result to a write",
      (env: ReturnType<typeof writeAndRun>) => resultOf(env.w1.id, "w1"),
    ],
    [
      "a written of another request's id, under the key of the write",
      (env: ReturnType<typeof writeAndRun>) =>
        writtenOf(env.w1.id + 97, "w1", SMALL_FILE),
    ],
  ])(
    "%s fails the write as a defect, written to the console, and ends the worker; the run waiting reaches the new one",
    async (_name, message) => {
      const console_ = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);
      const env = writeAndRun();
      emit(env.first, message(env));
      expect(await now(env.w1.outcome)).toMatchObject({
        kind: "failed",
        error: { kind: "defect" },
      });
      expect(console_).toHaveBeenCalledOnce();
      expectReopenedThenK5(env);
    },
  );

  test("a written to a run fails the run as a defect, and ends the worker", async () => {
    const console_ = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const env = withA();
    const k1 = env.client.run("k1", job("A"), noProgress);
    emit(env.first, writtenOf(k1.id, "k1", SMALL_FILE));
    expect(await now(k1.outcome)).toMatchObject({
      kind: "failed",
      error: { kind: "defect" },
    });
    expect(console_).toHaveBeenCalledOnce();
    expect(env.first.terminated).toBe(true);
    expect(env.calculation).toHaveLength(2);
  });
});

describe("VS1 D5 the write of the client: cancelling", () => {
  test("a cancel of a write that waits takes it out of the queue, and no worker is ended", async () => {
    const env = withA();
    const k1 = env.client.run("k1", job("A"), noProgress);
    const w1 = env.client.write("w1", writeJob("A"), noProgress);
    w1.cancel();
    expect(await now(w1.outcome)).toEqual({ kind: "cancelled" });
    emit(env.first, resultOf(k1.id, "k1"));
    expect(sentTo(env.first).map((sent) => sent.kind)).toEqual(["open", "run"]);
    expect(env.first.terminated).toBe(false);
  });

  test("a cancel of a write that runs ends the worker, and the written it posted after goes to no one", async () => {
    const env = writeAndRun();
    env.w1.cancel();
    expect(await now(env.w1.outcome)).toEqual({ kind: "cancelled" });
    emit(env.first, writtenOf(env.w1.id, "w1", SMALL_FILE));
    expectReopenedThenK5(env);
  });

  test("a new load while a file is written cancels the write and every request on the old load, and ends the worker", async () => {
    const env = writeAndRun();
    env.client.addFile("B", FILE_B);
    const readB = env.client.openVariants({ fileId: "B", ...NEI });
    expect(await now(env.w1.outcome)).toEqual({ kind: "cancelled" });
    expect(await now(env.k5.outcome)).toEqual({ kind: "cancelled" });
    expect(env.first.terminated).toBe(true);
    const second = last(env.calculation);
    emit(second, READY);
    expect(sentTo(second)).toMatchObject([{ kind: "open", fileId: "B" }]);
    expect(await now(readB.outcome)).toBe("pending");
  });
});

describe("VS1 D5 the write of the client: the restart after a large write", () => {
  test("a written of 25,000,001 bytes, a byte above WRITE_RESTART_BYTES: the write is done, the worker ended, and a new one opens A again, then runs k5", async () => {
    const env = writeAndRun();
    emit(env.first, writtenOf(env.w1.id, "w1", LARGE_FILE));
    const outcome = await now(env.w1.outcome);
    expect(outcome).toMatchObject({ kind: "done", key: "w1" });
    expect(fileOf(outcome)?.size).toBe(WRITE_RESTART_BYTES + 1);
    expectReopenedThenK5(env);
  });

  test("a run given between the answer of a large write and the new worker's open waits in the queue, and is sent after k5", async () => {
    const env = writeAndRun();
    emit(env.first, writtenOf(env.w1.id, "w1", LARGE_FILE));
    expect(await now(env.w1.outcome)).toMatchObject({ kind: "done" });
    const k6 = env.client.run("k6", job("A"), noProgress);
    const second = last(env.calculation);
    expect(env.calculation).toHaveLength(2);
    expect(second.posted).toEqual([]);
    expect(await now(k6.outcome)).toBe("pending");
    emit(second, READY);
    const open = lastSent(second);
    expect(open).toMatchObject({ kind: "open", fileId: "A" });
    emit(second, opened(open.id));
    expect(lastSent(second)).toMatchObject({ kind: "run", id: env.k5.id });
    emit(second, resultOf(env.k5.id, "k5"));
    expect(lastSent(second)).toMatchObject({
      kind: "run",
      id: k6.id,
      key: "k6",
    });
    expect(second.posted).toHaveLength(3);
  });

  test("a written of exactly WRITE_RESTART_BYTES, 25,000,000 bytes, ends no worker, and k5 is sent to it", async () => {
    const env = writeAndRun();
    const exact = new Blob([new Uint8Array(WRITE_RESTART_BYTES)]);
    emit(env.first, writtenOf(env.w1.id, "w1", exact));
    expect(await now(env.w1.outcome)).toMatchObject({ kind: "done" });
    expect(env.first.terminated).toBe(false);
    expect(env.calculation).toHaveLength(1);
    expect(lastSent(env.first)).toMatchObject({ kind: "run", id: env.k5.id });
  });

  test("a write that popnei refused fails with its message, and the worker is started again as after a large one", async () => {
    const env = writeAndRun();
    emit(env.first, {
      kind: "refused",
      id: env.w1.id,
      message: "memory allocation failed",
    });
    expect(await now(env.w1.outcome)).toEqual({
      kind: "failed",
      error: { kind: "popnei", message: "memory allocation failed" },
    });
    expectReopenedThenK5(env);
  });

  test("the outcome of a large write is given before the restart: when no new worker can be made, the write is done and then k5 fails", async () => {
    const calculation: FakeWorker[] = [];
    const client = createClient({
      calculation: () => {
        if (calculation.length > 0) {
          throw new Error("the script of the worker is not served");
        }
        const worker = fakeWorker();
        calculation.push(worker);
        return worker;
      },
      light: fakeWorker,
      onPopneiReady: () => undefined,
    });
    const first = last(calculation);
    client.addFile("A", FILE_A);
    client.openVariants({ fileId: "A", ...NEI });
    emit(first, READY);
    emit(first, opened(lastSent(first).id));
    const w1 = client.write("w1", writeJob("A"), noProgress);
    const k5 = client.run("k5", job("A"), noProgress);
    const order: string[] = [];
    void w1.outcome.then((outcome) => order.push(`w1 ${outcome.kind}`));
    void k5.outcome.then((outcome) => order.push(`k5 ${outcome.kind}`));
    emit(first, writtenOf(w1.id, "w1", LARGE_FILE));
    await now(k5.outcome);
    expect(first.terminated).toBe(true);
    expect(order).toEqual(["w1 done", "k5 failed"]);
  });

  test("a large write whose load is no longer the next one: the new worker opens the other load, not A", () => {
    const env = withA();
    const w1 = env.client.write("w1", writeJob("A"), noProgress);
    emit(env.first, writtenOf(w1.id, "w1", LARGE_FILE));
    expect(env.first.terminated).toBe(true);
    env.client.addFile("B", FILE_B);
    env.client.openVariants({ fileId: "B", ...NEI });
    expect(env.calculation).toHaveLength(2);
    const second = last(env.calculation);
    emit(second, READY);
    expect(sentTo(second)).toMatchObject([{ kind: "open", fileId: "B" }]);
  });

  test("a ready of protocol 3, stage 4's, of the worker started again after a large write fails every request with protocolMismatch, and no other worker is made", async () => {
    vi.useFakeTimers();
    const env = writeAndRun();
    const w2 = env.client.write("w2", writeJob("A"), noProgress);
    emit(env.first, writtenOf(env.w1.id, "w1", LARGE_FILE));
    emit(last(env.calculation), { kind: "ready", protocol: 3 });
    expect(await now(env.k5.outcome)).toEqual({
      kind: "failed",
      error: { kind: "protocolMismatch" },
    });
    expect(await now(w2.outcome)).toEqual({
      kind: "failed",
      error: { kind: "protocolMismatch" },
    });
    const w3 = env.client.write("w3", writeJob("A"), noProgress);
    expect(await now(w3.outcome)).toEqual({
      kind: "failed",
      error: { kind: "protocolMismatch" },
    });
    vi.advanceTimersByTime(3 * WORKER_READY_TIMEOUT_MS);
    expect(env.calculation).toHaveLength(2);
    vi.useRealTimers();
  });
});

describe("VS1 D5 the write of the client: the failures of a write", () => {
  test("a write of a load with no File, or whose first open was refused, fails at once as a defect", async () => {
    const env = setUp();
    const first = last(env.calculation);
    const noFile = env.client.write("w1", writeJob("Z"), noProgress);
    expect(await now(noFile.outcome)).toMatchObject({
      kind: "failed",
      error: { kind: "defect" },
    });
    env.client.addFile("A", FILE_A);
    env.client.openVariants({ fileId: "A", ...NEI });
    emit(first, READY);
    emit(first, {
      kind: "refused",
      id: lastSent(first).id,
      message: "not nei",
    });
    const refused = env.client.write("w2", writeJob("A"), noProgress);
    expect(await now(refused.outcome)).toMatchObject({
      kind: "failed",
      error: { kind: "defect" },
    });
    expect(sentTo(first).map((sent) => sent.kind)).toEqual(["open"]);
  });

  test("a write that ends reopenFailed fails with it, and the worker goes on", async () => {
    const env = writeAndRun();
    emit(env.first, {
      kind: "reopenFailed",
      id: env.w1.id,
      name: "panel.nei",
      message: "NotReadableError",
    });
    expect(await now(env.w1.outcome)).toEqual({
      kind: "failed",
      error: {
        kind: "reopenFailed",
        name: "panel.nei",
        message: "NotReadableError",
      },
    });
    expect(env.first.terminated).toBe(false);
    expect(lastSent(env.first)).toMatchObject({ kind: "run", id: env.k5.id });
  });

  test("a write answered with its written sets the count of failures back: one more idle crash starts the worker again", () => {
    const env = withA();
    emit(env.first, { kind: "crashed", message: "trap" });
    const second = last(env.calculation);
    emit(second, READY);
    emit(second, opened(lastSent(second).id));
    const w1 = env.client.write("w1", writeJob("A"), noProgress);
    emit(second, writtenOf(w1.id, "w1", SMALL_FILE));
    emit(second, { kind: "crashed", message: "trap" });
    expect(env.calculation).toHaveLength(3);
  });

  test("a crash while a write runs fails it as workerFailed; the run waiting reaches the new worker", async () => {
    const env = writeAndRun();
    emit(env.first, { kind: "crashed", message: "out of memory" });
    expect(await now(env.w1.outcome)).toEqual({
      kind: "failed",
      error: { kind: "workerFailed", message: "out of memory" },
    });
    expectReopenedThenK5(env);
  });

  test("a write waiting on an open sent for it fails with reopenFailed when that open is refused, and that worker is ended", async () => {
    const env = withA();
    env.client.addFile("B", FILE_B);
    env.client.openVariants({ fileId: "B", ...NEI });
    const second = last(env.calculation);
    emit(second, READY);
    emit(second, opened(lastSent(second).id));
    const w1 = env.client.write("w1", writeJob("A"), noProgress);
    const third = last(env.calculation);
    emit(third, READY);
    const open = lastSent(third);
    expect(open).toMatchObject({ kind: "open", fileId: "A" });
    emit(third, { kind: "refused", id: open.id, message: "not a vars file" });
    expect(await now(w1.outcome)).toEqual({
      kind: "failed",
      error: {
        kind: "reopenFailed",
        name: "panel.nei",
        message: "not a vars file",
      },
    });
    expect(third.terminated).toBe(true);
  });
});

/** Names of `count` individuals, s1 to s<count>. */
function names(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `s${String(i + 1)}`);
}

function pcaJob(
  individuals: readonly string[] | null,
  method: PcaMethod = "pca",
): PcaJob {
  return {
    analysis: "pca",
    fileId: "A",
    filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.05 }],
    individuals,
    method,
    numCompsKept: 10,
  };
}

/** A result of the principal components the check of a result takes; the
    client reads nothing of it but its analysis. */
function pcaResult(method: PcaMethod): PcaResult {
  return {
    analysis: "pca",
    method,
    individuals: ["s1", "s2"],
    numComps: 1,
    numCompsFound: 1,
    projections: Float64Array.of(18.8, -18.8),
    explainedVariancePercent: Float64Array.of(100),
    numVarsUsed: method === "pca" ? 1152 : null,
    lingoesConstant: method === "pca" ? null : 0,
    negativeEigenvaluesPercent: method === "pca" ? null : 0,
    passStats: RESULT.passStats,
  };
}

/** Load A read with `numInFile` individuals, a run k1 of the principal
    components of `job` running on the first worker, and a run k6 waiting. */
function pcaAndRun(
  numInFile: number,
  pca: PcaJob,
): ReturnType<typeof setUp> & {
  readonly first: FakeWorker;
  readonly k1: ReturnType<ReturnType<typeof createClient>["run"]>;
  readonly k6: ReturnType<ReturnType<typeof createClient>["run"]>;
} {
  const env = setUp();
  const first = last(env.calculation);
  env.client.addFile("A", FILE_A);
  env.client.openVariants({ fileId: "A", ...NEI });
  emit(first, READY);
  emit(first, {
    kind: "opened",
    id: lastSent(first).id,
    individuals: names(numInFile),
    ploidy: 2,
  });
  const k1 = env.client.run("k1", pca, noProgress);
  const k6 = env.client.run("k6", job("A"), noProgress);
  expect(lastSent(first)).toEqual({
    kind: "run",
    id: k1.id,
    key: "k1",
    job: pca,
  });
  return { ...env, first, k1, k6 };
}

/** The worker after a restart that follows a PCA: ended with no handler
    left, and a new one that, once ready, is sent the open of A with its
    File, announces the version when that open ends, and then runs k6. */
function expectReopenedThenK6(env: ReturnType<typeof pcaAndRun>): void {
  expect(env.first.terminated).toBe(true);
  expect(env.first.endedWithHandlers).toBe(false);
  expect(env.calculation).toHaveLength(2);
  const second = last(env.calculation);
  expect(second.posted).toEqual([]);
  emit(second, READY);
  const open = lastSent(second);
  expect(open).toMatchObject({ kind: "open", fileId: "A" });
  expect(open.kind === "open" && open.file).toBe(FILE_A);
  expect(env.versions).toEqual(["0.1.0"]);
  emit(second, opened(open.id));
  expect(env.versions).toEqual(["0.1.0", "0.1.0"]);
  expect(lastSent(second)).toMatchObject({
    kind: "run",
    id: env.k6.id,
    key: "k6",
  });
  expect(second.posted).toHaveLength(2);
}

/** The worker was not ended, and was sent k6 after k1. */
function expectK6OnTheSameWorker(env: ReturnType<typeof pcaAndRun>): void {
  expect(env.first.terminated).toBe(false);
  expect(env.calculation).toHaveLength(1);
  expect(lastSent(env.first)).toMatchObject({
    kind: "run",
    id: env.k6.id,
    key: "k6",
  });
}

describe("IP6 D3 the restart after a large PCA", () => {
  test("PCA_RESTART_INDIVIDUALS is 700, until the measurement of the PCA sets it", () => {
    expect(PCA_RESTART_INDIVIDUALS).toBe(700);
  });

  test("a result of a PCA of 701 individuals of its list, a run waiting: the PCA is done, the worker ended, and a new one opens A again, then runs k6", async () => {
    const env = pcaAndRun(800, pcaJob(names(PCA_RESTART_INDIVIDUALS + 1)));
    emit(env.first, {
      kind: "result",
      id: env.k1.id,
      key: "k1",
      result: pcaResult("pca"),
    });
    expect(await now(env.k1.outcome)).toEqual({
      kind: "done",
      key: "k1",
      result: pcaResult("pca"),
    });
    expectReopenedThenK6(env);
  });

  test("a PCA of 700 individuals of its list, over a load of 800, ends no worker, and k6 is sent to it", async () => {
    const env = pcaAndRun(800, pcaJob(names(PCA_RESTART_INDIVIDUALS)));
    emit(env.first, {
      kind: "result",
      id: env.k1.id,
      key: "k1",
      result: pcaResult("pca"),
    });
    expect(await now(env.k1.outcome)).toMatchObject({
      kind: "done",
      key: "k1",
    });
    expectK6OnTheSameWorker(env);
  });

  test("a PCoA with individuals null over a load whose opened gave 701 ends the worker, as a PCA does", async () => {
    const env = pcaAndRun(PCA_RESTART_INDIVIDUALS + 1, pcaJob(null, "pcoa"));
    emit(env.first, {
      kind: "result",
      id: env.k1.id,
      key: "k1",
      result: pcaResult("pcoa"),
    });
    expect(await now(env.k1.outcome)).toMatchObject({
      kind: "done",
      key: "k1",
    });
    expectReopenedThenK6(env);
  });

  test("a PCA with individuals null over a load of 700 ends no worker", async () => {
    const env = pcaAndRun(PCA_RESTART_INDIVIDUALS, pcaJob(null));
    emit(env.first, {
      kind: "result",
      id: env.k1.id,
      key: "k1",
      result: pcaResult("pca"),
    });
    expect(await now(env.k1.outcome)).toMatchObject({
      kind: "done",
      key: "k1",
    });
    expectK6OnTheSameWorker(env);
  });

  test("a PCA with individuals null over a load of 701 that popnei refused fails with its message, and the worker is started again", async () => {
    const env = pcaAndRun(PCA_RESTART_INDIVIDUALS + 1, pcaJob(null));
    emit(env.first, {
      kind: "refused",
      id: env.k1.id,
      message: "no variant with variance",
    });
    expect(await now(env.k1.outcome)).toEqual({
      kind: "failed",
      error: { kind: "popnei", message: "no variant with variance" },
    });
    expectReopenedThenK6(env);
  });

  test("a PCA of 700 that popnei refused ends no worker", async () => {
    const env = pcaAndRun(800, pcaJob(names(PCA_RESTART_INDIVIDUALS)));
    emit(env.first, {
      kind: "refused",
      id: env.k1.id,
      message: "no variant with variance",
    });
    expect(await now(env.k1.outcome)).toMatchObject({ kind: "failed" });
    expectK6OnTheSameWorker(env);
  });

  test("a PCA of 701 that ends reopenFailed fails with it, and the worker is not ended", async () => {
    const env = pcaAndRun(PCA_RESTART_INDIVIDUALS + 1, pcaJob(null));
    emit(env.first, {
      kind: "reopenFailed",
      id: env.k1.id,
      name: "panel.nei",
      message: "the file could not be read",
    });
    expect(await now(env.k1.outcome)).toEqual({
      kind: "failed",
      error: {
        kind: "reopenFailed",
        name: "panel.nei",
        message: "the file could not be read",
      },
    });
    expectK6OnTheSameWorker(env);
  });

  test("a PCA of 700 of its list over a load of 701 ends no worker, the list and not the load counting; nor does a run of another analysis after it", async () => {
    const env = pcaAndRun(
      PCA_RESTART_INDIVIDUALS + 1,
      pcaJob(names(PCA_RESTART_INDIVIDUALS)),
    );
    emit(env.first, {
      kind: "result",
      id: env.k1.id,
      key: "k1",
      result: pcaResult("pca"),
    });
    expect(await now(env.k1.outcome)).toMatchObject({ kind: "done" });
    expectK6OnTheSameWorker(env);
    emit(env.first, resultOf(env.k6.id, "k6"));
    expect(await now(env.k6.outcome)).toMatchObject({
      kind: "done",
      key: "k6",
    });
    expect(env.first.terminated).toBe(false);
    expect(env.calculation).toHaveLength(1);
  });

  test("the outcome of a large PCA is given before the restart: when no new worker can be made, the PCA is done and then k6 fails", async () => {
    const calculation: FakeWorker[] = [];
    const client = createClient({
      calculation: () => {
        if (calculation.length > 0) {
          throw new Error("the script of the worker is not served");
        }
        const worker = fakeWorker();
        calculation.push(worker);
        return worker;
      },
      light: fakeWorker,
      onPopneiReady: () => undefined,
    });
    const first = last(calculation);
    client.addFile("A", FILE_A);
    client.openVariants({ fileId: "A", ...NEI });
    emit(first, READY);
    emit(first, opened(lastSent(first).id));
    const k1 = client.run(
      "k1",
      pcaJob(names(PCA_RESTART_INDIVIDUALS + 1)),
      noProgress,
    );
    const k6 = client.run("k6", job("A"), noProgress);
    const order: string[] = [];
    void k1.outcome.then((outcome) => order.push(`k1 ${outcome.kind}`));
    void k6.outcome.then((outcome) => order.push(`k6 ${outcome.kind}`));
    emit(first, {
      kind: "result",
      id: k1.id,
      key: "k1",
      result: pcaResult("pca"),
    });
    await now(k6.outcome);
    expect(first.terminated).toBe(true);
    expect(order).toEqual(["k1 done", "k6 failed"]);
  });
});

describe("IP9 a crash of a worker reaches the console", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test("the light worker crashed while it read an xlsx: the read fails as workerFailed, and its message is written to the console", async () => {
    const logged = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const env = setUp();
    env.client.addFile("ind", CSV_FILE);
    const read = env.client.readIndividuals("ind", null);
    const worker = last(env.light);
    emit(worker, LIGHT_READY);
    emit(worker, { kind: "crashed", message: "RuntimeError: unreachable" });

    expect(await now(read.outcome)).toEqual({
      kind: "failed",
      error: { kind: "workerFailed", message: "RuntimeError: unreachable" },
    });
    expect(logged).toHaveBeenCalledWith(
      "popnei_web: the light worker stopped. RuntimeError: unreachable",
    );
  });

  test("the calculation worker crashed: its message is written to the console", () => {
    const logged = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const env = setUp();
    emit(last(env.calculation), READY);
    emit(last(env.calculation), { kind: "crashed", message: "trap" });
    expect(logged).toHaveBeenCalledWith(
      "popnei_web: the calculation worker stopped. trap",
    );
  });
});
