import { describe, expect, test } from "vitest";

import { POPGEN_ANALYSES, firstProject, numVarsOf } from "../core/apps.ts";
import { CACHE_MAX_BYTES } from "../core/cache.ts";
import { MAX_UNDO_STEPS } from "../core/history.ts";
import type { Project } from "../core/project.ts";
import { createStore } from "../core/store.ts";
import type { Store } from "../core/store.ts";
import type { Job, JobResult, Outcome, Run } from "../worker/protocol.ts";
import { startAnalysis, startedAt } from "./runs.ts";

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
    },
  },
  individuals: {
    fileId: "00000000000000000000000000000001",
    name: "pops.csv",
    csv: { encoding: "auto", separator: "auto", decimal: "auto" },
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
  readonly ended: [number, Outcome<JobResult>][];
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
    numVarsOf,
    appVersion: "0.1.0",
    cacheMaxBytes: CACHE_MAX_BYTES,
    maxUndoSteps: MAX_UNDO_STEPS,
  });
  real.popneiReady("0.1.0");
  if (project !== null) {
    real.open(project);
  }
  const ended: [number, Outcome<JobResult>][] = [];
  const store: Store<JobResult> = {
    ...real,
    runEnded: (runId, outcome) => {
      ended.push([runId, outcome]);
      real.runEnded(runId, outcome);
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
