/**
 * The script of the calculation worker, runnerWorker.ts, in node over a
 * fake global scope of a worker, with runner.ts replaced by a runner whose
 * calls the test sets: a mistake of our code, a TypeError thrown outside a
 * call to popnei, reaches the script's catch or its listener of errors,
 * which post `crashed` and close the worker, and the client makes that a
 * `workerFailed` (docs/specs/worker/protocol.md, the cases).
 */
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { Runner, RunnerOptions } from "./runner.ts";

/** What the fake runner's `open` and `run` do, which each test sets, and
    the options the script made its runner with, `null` before it made
    one. */
const calls: {
  open: Runner["open"];
  run: Runner["run"];
  options: RunnerOptions | null;
} = {
  open: () => {
    throw new Error("the test set no open");
  },
  run: () => {
    throw new Error("the test runs no job");
  },
  options: null,
};

vi.mock("./runner.ts", () => ({
  loadPopnei: () => Promise.resolve({ ok: true, value: "0.1.0" }),
  createRunner: (options: RunnerOptions = {}): Runner => {
    calls.options = options;
    return {
      open: (load, file) => calls.open(load, file),
      run: (job, told, toldSoFar) => calls.run(job, told, toldSoFar),
      write: () => {
        throw new Error("the test writes no file");
      },
    };
  },
  transferablesOf: () => [],
}));

/** The fake global scope of the worker: what it posted, whether it
    closed, its listeners by the name of their event, and the error its
    `postMessage` throws for a message, as a DataCloneError, or null. */
interface Scope {
  readonly posted: unknown[];
  closed: boolean;
  readonly listeners: Map<string, (event: unknown) => void>;
  postError: (message: unknown) => Error | null;
}

let scope: Scope;

beforeEach(() => {
  vi.resetModules();
  const made: Scope = {
    posted: [],
    closed: false,
    listeners: new Map(),
    postError: () => null,
  };
  vi.stubGlobal("postMessage", (message: unknown) => {
    const error = made.postError(message);
    if (error !== null) {
      throw error;
    }
    made.posted.push(message);
  });
  vi.stubGlobal("close", () => {
    made.closed = true;
  });
  vi.stubGlobal(
    "addEventListener",
    (name: string, listener: (event: unknown) => void) => {
      made.listeners.set(name, listener);
    },
  );
  scope = made;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** The script, imported by a path the type check does not follow: it is
    checked with the library of a worker, and the tests with that of a
    page, whose postMessage takes other arguments. */
const SCRIPT = new URL("./runnerWorker.ts", import.meta.url).href;

/** Starts the script, and waits until it posted its ready. */
async function started(): Promise<void> {
  await import(/* @vite-ignore */ SCRIPT);
  await vi.waitFor(() => {
    expect(scope.posted).toContainEqual(
      expect.objectContaining({ kind: "ready" }),
    );
  });
}

/** Gives the script's listener of `name` the event `event`. */
function fire(name: string, event: unknown): void {
  const listener = scope.listeners.get(name);
  if (listener === undefined) {
    throw new Error(`the script listens to no ${name}`);
  }
  listener(event);
}

const OPEN = {
  kind: "open",
  id: 1,
  fileId: "load-a",
  file: new File(["NEI"], "panel.nei"),
  format: "nei",
  readOptions: null,
};

describe("VS1 D2 the script of the calculation worker: a mistake of our code", () => {
  test("a TypeError of the runner inside a request is posted as crashed with its message, and the worker closes", async () => {
    calls.open = () => {
      throw new TypeError("held.open is not a function");
    };
    await started();

    fire("message", { data: OPEN });

    await vi.waitFor(() => {
      expect(scope.closed).toBe(true);
    });
    expect(scope.posted.at(-1)).toEqual({
      kind: "crashed",
      message: "held.open is not a function",
    });
  });

  test("a TypeError outside a request reaches the listener of errors: crashed with its message, the worker closed, and the error kept from the page", async () => {
    await started();
    const preventDefault = vi.fn();

    fire("error", {
      message: "Uncaught TypeError: scope.x is not a function",
      preventDefault,
    });

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(scope.closed).toBe(true);
    expect(scope.posted.at(-1)).toEqual({
      kind: "crashed",
      message: "Uncaught TypeError: scope.x is not a function",
    });
  });
});

const RUN = {
  kind: "run",
  id: 2,
  key: "k1",
  job: {
    analysis: "variantsSummary",
    fileId: "load-a",
    filters: [],
    minNumIndividuals: 0,
    numBins: 1000,
    range: [0, 1],
  },
};

/** An error as the browser's postMessage throws for a message it cannot
    copy, a DataCloneError. */
function cloneError(): Error {
  const error = new Error("The object can not be cloned.");
  error.name = "DataCloneError";
  return error;
}

/** Whether `message` is a message of the kind `kind`. */
function isKind(message: unknown, kind: string): boolean {
  return (
    typeof message === "object" &&
    message !== null &&
    "kind" in message &&
    message.kind === kind
  );
}

describe("live-stats 2 the script of the calculation worker: a message it cannot post", () => {
  test.each([
    [
      "a result so far",
      "soFar",
      "popnei_web defect: the result so far could not be posted: The object can not be cloned.",
    ],
    [
      "a progress",
      "progress",
      "popnei_web defect: the progress could not be posted: The object can not be cloned.",
    ],
  ])(
    "%s the browser cannot post is crashed as a defect of ours, and the worker closes",
    async (_name, kind, message) => {
      calls.open = () => ({
        kind: "ok",
        value: { individuals: ["s0"], ploidy: 2, keepsPassed: false },
      });
      calls.run = (_job, told, toldSoFar) => {
        told({ bytesRead: 1, numBytes: 2, pass: 1, numPasses: 1 });
        toldSoFar?.({
          analysis: "filterCounts",
          passStats: { numVars: 0, filtering: {} },
        });
        throw new Error("the test reached the end of the run");
      };
      scope.postError = (posted) =>
        isKind(posted, kind) ? cloneError() : null;
      await started();

      fire("message", { data: OPEN });
      await vi.waitFor(() => {
        expect(scope.posted).toContainEqual(
          expect.objectContaining({ kind: "opened" }),
        );
      });
      fire("message", { data: RUN });

      await vi.waitFor(() => {
        expect(scope.closed).toBe(true);
      });
      expect(scope.posted.at(-1)).toEqual({ kind: "crashed", message });
    },
  );
});

describe("live-stats 3 the script of the calculation worker: a final result it cannot post", () => {
  test("a result the browser cannot post is crashed as a defect of ours, and the worker closes", async () => {
    calls.open = () => ({
      kind: "ok",
      value: { individuals: ["s0"], ploidy: 2, keepsPassed: false },
    });
    calls.run = () => ({
      kind: "ok",
      value: {
        analysis: "filterCounts",
        passStats: { numVars: 0, filtering: {} },
      },
    });
    scope.postError = (posted) =>
      isKind(posted, "result") ? cloneError() : null;
    await started();

    fire("message", { data: OPEN });
    await vi.waitFor(() => {
      expect(scope.posted).toContainEqual(
        expect.objectContaining({ kind: "opened" }),
      );
    });
    fire("message", { data: RUN });

    await vi.waitFor(() => {
      expect(scope.closed).toBe(true);
    });
    expect(scope.posted.at(-1)).toEqual({
      kind: "crashed",
      message:
        "popnei_web defect: the result could not be posted: The object can not be cloned.",
    });
  });
});

describe("DL2 D3 the script of the calculation worker makes its runner with readLastByte", () => {
  /** The ranges the fake FileReaderSync read, and whether it throws. */
  let read: Blob[] = [];
  let reading: "read" | "notReadable" = "read";

  class FakeFileReaderSync {
    readAsArrayBuffer(blob: Blob): ArrayBuffer {
      read.push(blob);
      if (reading === "notReadable") {
        throw new DOMException("the blob is gone", "NotReadableError");
      }
      return new ArrayBuffer(blob.size);
    }
  }

  beforeEach(() => {
    read = [];
    reading = "read";
    calls.options = null;
  });

  /** The readLastByte the script gave its runner, after its first
      request. */
  async function readLastByteOfScript(): Promise<(file: Blob) => void> {
    calls.open = () => ({
      kind: "ok",
      value: { individuals: ["s000"], ploidy: 2, keepsPassed: false },
    });
    await started();
    fire("message", { data: OPEN });
    await vi.waitFor(() => {
      expect(calls.options).not.toBeNull();
    });
    const readLastByte = calls.options?.readLastByte;
    if (readLastByte === undefined) {
      throw new Error("the script made its runner with no readLastByte");
    }
    return readLastByte;
  }

  test("the read is FileReaderSync's of the last byte of the file", async () => {
    vi.stubGlobal("FileReaderSync", FakeFileReaderSync);
    const readLastByte = await readLastByteOfScript();
    readLastByte(new Blob([new Uint8Array([1, 2, 3, 4, 5])]));
    expect(read).toHaveLength(1);
    expect(read[0]?.size).toBe(1);
    expect(new Uint8Array((await read[0]?.arrayBuffer()) ?? [])).toEqual(
      new Uint8Array([5]),
    );
  });

  test("a file the reader cannot read throws what the reader threw, and an empty file reads nothing", async () => {
    vi.stubGlobal("FileReaderSync", FakeFileReaderSync);
    const readLastByte = await readLastByteOfScript();
    reading = "notReadable";
    expect(() => {
      readLastByte(new Blob([new Uint8Array(3)]));
    }).toThrow("the blob is gone");
    read = [];
    readLastByte(new Blob([]));
    expect(read).toEqual([]);
  });
});
