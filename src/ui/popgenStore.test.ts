import { describe, expect, test } from "vitest";

import { firstProject } from "../core/apps.ts";
import { setThreshold } from "../core/project.ts";
import { fiveIndividualsProject, noPopDiversity } from "../core/testSupport.ts";
import type {
  Job,
  JobResult,
  Outcome,
  PassStats,
  Run,
  WriteJob,
  Written,
} from "../worker/protocol.ts";
import { createPopgenStore } from "./popgenStore.ts";

// The store as the entry makes it (docs/specs/entry.md, "At the
// opening", step 3), with fakes of the worker client's `run` and `write`
// that record what they were sent and whose outcomes the test gives.

/** The counts of a pass of the missing data filter over 1,200 variants. */
const MISSING_PASS: PassStats = {
  numVars: 1152,
  filtering: { missing_data: { varsProcessed: 1200, varsKept: 1152 } },
};

function setUp(): {
  readonly store: ReturnType<typeof createPopgenStore>;
  readonly jobs: Job[];
  readonly writes: WriteJob[];
} {
  const jobs: Job[] = [];
  const writes: WriteJob[] = [];
  let lastId = 0;
  const store = createPopgenStore({
    send: (_key, job): Run<JobResult> => {
      jobs.push(job);
      lastId += 1;
      return {
        id: lastId,
        outcome: new Promise<Outcome<JobResult>>(() => undefined),
        cancel: () => undefined,
      };
    },
    sendWrite: (_key, job): Run<Written<Blob>> => {
      writes.push(job);
      lastId += 1;
      return {
        id: lastId,
        outcome: new Promise<Outcome<Written<Blob>>>(() => undefined),
        cancel: () => undefined,
      };
    },
    appVersion: "0.1.0",
  });
  store.popneiReady("0.1.0");
  return { store, jobs, writes };
}

describe("VS5 D1 the store of the page", () => {
  test("a Run of the diversity with a threshold on the individuals and no statistics sends the statistics of each individual and waits for them", () => {
    const { store, jobs } = setUp();
    store.open(
      fiveIndividualsProject([
        { kind: "missing_data", maxAllowedMissingRate: 0.2 },
      ]),
    );

    const runs = store.startRun("diversity");

    expect(runs).toHaveLength(1);
    expect(jobs.map((job) => job.analysis)).toEqual(["individualChecks"]);
    const diversity = store
      .getState()
      .analyses.find((view) => view.id === "diversity");
    expect(diversity?.status).toMatchObject({
      kind: "running",
      waitsForStatistics: true,
    });
  });

  test("the end of a diversity fills the counts of the filters", () => {
    const { store } = setUp();
    store.open(fiveIndividualsProject([]));
    const runs = store.startRun("diversity") ?? [];
    const run = runs[0];
    if (run === undefined) throw new Error("no request was sent");
    const key = store
      .getState()
      .runs.find((view) => view.runId === run.id)?.key;
    if (key === undefined) throw new Error("the request has no key");

    store.runEnded(run.id, {
      kind: "done",
      key,
      result: {
        analysis: "diversity",
        pops: ["P1", "P2"],
        numIndividuals: Uint32Array.from([3, 2]),
        unbiasedExpHet: Float64Array.from([0.3, 0.4]),
        obsHet: Float64Array.from([0.3, 0.4]),
        polyRatio: Float64Array.from([0.9, 0.8]),
        numVarsWithValue: Uint32Array.from([1152, 1152]),
        ...noPopDiversity(2),
        passStats: MISSING_PASS,
      },
    });

    const counts = store
      .getState()
      .analyses.find((view) => view.id === "filterCounts");
    expect(counts?.status).toMatchObject({
      kind: "done",
      result: { analysis: "filterCounts", passStats: MISSING_PASS },
    });
  });

  test("Write sends the write of the filtered variants to the worker client's write", () => {
    const { store, jobs, writes } = setUp();
    store.open(fiveIndividualsProject([]));

    const runs = store.startWrite("nei");

    expect(runs).toHaveLength(1);
    expect(jobs).toEqual([]);
    expect(writes.map((job) => job.format)).toEqual(["nei"]);
  });
});

describe("SF5 D5 the store of popgen.html", () => {
  test('starts from firstProject("popgen"), and a change of a filter that removes nothing gives no notice', () => {
    const { store } = setUp();
    expect(store.getState().project).toStrictEqual(firstProject("popgen"));
    store.open(fiveIndividualsProject([]));

    store.apply("the MAF filter changed", (p) =>
      setThreshold(p, { of: "variants", kind: "maf" }, 0.3),
    );

    expect(store.getState().notice).toBeNull();
  });
});
