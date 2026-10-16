import { describe, expect, test, vi } from "vitest";

import {
  firstProject,
  popgen2FirstProject,
  summaryStatsOf,
} from "../core/apps.ts";
import { keyFromWire, writeKeyOf, createKeyMemo } from "../core/keys.ts";
import { pcaOnPopgen2 } from "../core/analyses/pca.ts";
import {
  loadVariants,
  setAnalysisOptions,
  setThreshold,
  turnOffVariantFilter,
} from "../core/project.ts";
import type { VariantLoad } from "../core/project.ts";
import { createStore } from "../core/store.ts";
import type { Store } from "../core/store.ts";
import { summaryResult } from "../core/testSupport.ts";
import type {
  Job,
  JobResult,
  Outcome,
  Progress,
  Run,
  VariantsSummaryResult,
  WriteJob,
  Written,
} from "../worker/protocol.ts";
import {
  POPGEN2_AUTO_GROUPS,
  createPopgen2Store,
  openVariantsFile,
  popgen2StoreConfig,
} from "./popgen2Store.ts";
import type { Popgen2PageStore } from "./popgen2Store.ts";
import { startAnalysis } from "./runs.ts";
import {
  RUN_QUIET_MS,
  createRunGate,
  createThresholdRun,
  gatedStore,
} from "./variants/thresholdRun.ts";
import { summaryStatus } from "./variants/words.ts";

// The store of popgen2.html as its entry makes it, with a fake `send`
// that records the jobs and never ends them.

describe("the store of popgen2.html", () => {
  test("one-pass the page starts by itself the summary alone, whose one pass gives the statistics too, and then the PCA, the diversity, the distances and the LD decay once live, each a group of its own", () => {
    expect(POPGEN2_AUTO_GROUPS).toEqual([
      ["variantsSummary"],
      ["pca"],
      ["diversity"],
      ["popDists"],
      ["ldDecay"],
    ]);
  });

  test("it sends the summary with no filter and the bins of the histograms of the variants, and has no analysis of the statistics of their own", () => {
    const jobs: Job[] = [];
    const store = createPopgen2Store({
      send: (_key, job): Run<JobResult> => {
        jobs.push(job);
        return {
          id: jobs.length,
          outcome: new Promise<Outcome<JobResult>>(() => undefined),
          cancel: () => undefined,
        };
      },
      sendWrite: () => {
        throw new Error("popnei_web defect: no write is sent here");
      },
      appVersion: "0.1.0",
    });
    store.popneiReady("0.1.0");
    const fileId = "0123456789abcdef0123456789abcdef";
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
      keepsPassed: false,
    });

    store.startRun("variantsSummary");

    expect(jobs).toEqual([
      {
        analysis: "variantsSummary",
        fileId,
        filters: [],
        minNumIndividuals: 0,
        numBins: 1000,
        range: [0, 1],
      },
    ]);
    expect(store.getState().analyses.map((a) => [a.id, a.status.kind])).toEqual(
      [
        ["variantsSummary", "running"],
        // The PCA and the LD decay run with no option typed (the owner,
        // 16 October 2026).
        ["pca", "ready"],
        ["diversity", "ready"],
        ["popDists", "locked"],
        ["ldDecay", "ready"],
      ],
    );
  });
});

/** A load of a VCF named `name`, as the page makes it. */
function vcfLoad(fileId: string, name: string): VariantLoad {
  return {
    fileId,
    name,
    size: 87_000,
    format: "vcf",
    readOptions: { ploidy: null, onlyPassed: false },
  };
}

describe("live-stats 2 the results so far of popgen2.html across a new file", () => {
  test("a file opened while the pass of another runs never shows that pass's late results so far, nor its late result", async () => {
    const outcomes: ((outcome: Outcome<JobResult>) => void)[] = [];
    const soFars: ((result: JobResult) => void)[] = [];
    const store = createPopgen2Store({
      send: (_key, _job, _onProgress, onSoFar): Run<JobResult> => {
        soFars.push(onSoFar);
        const id = soFars.length;
        const outcome = new Promise<Outcome<JobResult>>((resolve) => {
          outcomes.push(resolve);
        });
        return { id, outcome, cancel: () => undefined };
      },
      sendWrite: () => {
        throw new Error("popnei_web defect: no write is sent here");
      },
      appVersion: "0.1.0",
    });
    store.popneiReady("0.1.0");
    const fileA = vcfLoad("a".repeat(32), "a.vcf.gz");
    const fileB = vcfLoad("b".repeat(32), "b.vcf.gz");
    const read = {
      kind: "read",
      individuals: ["s000", "s001"],
      ploidy: 2,
      numVars: null,
      keepsPassed: true,
    } as const;
    openVariantsFile(store, fileA);
    store.variantsRead(fileA.fileId, read);
    void startAnalysis(store, "variantsSummary");
    const soFarOfA = soFars[0];
    const endOfA = outcomes[0];
    if (soFarOfA === undefined || endOfA === undefined) {
      throw new Error("the summary of a.vcf.gz was not sent");
    }
    soFarOfA(summaryResult(["chr1"], [100]));
    const runningA = summaryStatus(store.getState());
    expect(runningA).toMatchObject({
      kind: "running",
      soFar: { passStats: { numVars: 100 } },
    });
    if (runningA.kind !== "running") {
      throw new Error(`the summary of a.vcf.gz is ${runningA.kind}`);
    }

    openVariantsFile(store, fileB);
    expect(summaryStatus(store.getState()).kind).toBe("locked");
    soFarOfA(summaryResult(["chr1"], [200]));
    expect(summaryStatus(store.getState()).kind).toBe("locked");
    store.variantsRead(fileB.fileId, read);
    expect(summaryStatus(store.getState()).kind).toBe("ready");
    void startAnalysis(store, "variantsSummary");
    expect(soFars).toHaveLength(2);
    expect(summaryStatus(store.getState())).toMatchObject({
      kind: "running",
      runId: 2,
      soFar: null,
    });

    soFarOfA(summaryResult(["chr1"], [300]));
    expect(summaryStatus(store.getState())).toMatchObject({
      kind: "running",
      runId: 2,
      soFar: null,
    });
    endOfA({
      kind: "done",
      key: runningA.key,
      result: summaryResult(["chr1"], [999]),
    });
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    expect(summaryStatus(store.getState())).toMatchObject({
      kind: "running",
      runId: 2,
      soFar: null,
    });
  });
});

describe("SF5 D5 the store of popgen2.html", () => {
  test("starts from popgen2FirstProject(), not the old page's first project, and a change of a filter gives no notice", () => {
    const store = createPopgen2Store({
      send: (): Run<JobResult> => {
        throw new Error("popnei_web defect: nothing is sent here");
      },
      sendWrite: () => {
        throw new Error("popnei_web defect: no write is sent here");
      },
      appVersion: "0.1.0",
    });
    expect(store.getState().project).toStrictEqual(popgen2FirstProject());
    expect(store.getState().project).not.toStrictEqual(firstProject("popgen"));

    store.apply("the MAF filter changed", (p) =>
      setThreshold(p, { of: "variants", kind: "maf" }, 0.3),
    );

    expect(store.getState().undo).toBe("the MAF filter changed");
    expect(store.getState().notice).toBeNull();
  });
});

describe("SF7 round an opening on popgen2.html starts the history afresh", () => {
  test("the first file and another leave nothing in the history, keep the filters as the user left them, stop the pass of the file before and give no notice", () => {
    const cancelled: number[] = [];
    let sent = 0;
    const store = createPopgen2Store({
      send: (): Run<JobResult> => {
        sent += 1;
        const id = sent;
        return {
          id,
          outcome: new Promise<Outcome<JobResult>>(() => undefined),
          cancel: () => {
            cancelled.push(id);
          },
        };
      },
      sendWrite: () => {
        throw new Error("popnei_web defect: no write is sent here");
      },
      appVersion: "0.1.0",
    });
    store.popneiReady("0.1.0");
    const fileA = vcfLoad("a".repeat(32), "a.vcf.gz");
    const fileB = vcfLoad("b".repeat(32), "b.vcf.gz");
    const read = {
      kind: "read",
      individuals: ["s000", "s001"],
      ploidy: 2,
      numVars: null,
      keepsPassed: true,
    } as const;

    openVariantsFile(store, fileA);
    expect(store.getState().project.variants?.fileId).toBe(fileA.fileId);
    expect(store.getState().undo).toBeNull();
    expect(store.getState().redo).toBeNull();
    store.variantsRead(fileA.fileId, read);
    void startAnalysis(store, "variantsSummary");
    expect(summaryStatus(store.getState()).kind).toBe("running");

    store.apply("the variants that failed their FILTER are kept", (p) =>
      turnOffVariantFilter(p, "passed"),
    );
    store.apply("the MAF filter changed", (p) =>
      setThreshold(p, { of: "variants", kind: "maf" }, 0.3),
    );
    const filtered = store.getState().project;
    const moves = store.getState().historyMoves;

    openVariantsFile(store, fileB);

    const opened = store.getState();
    expect(opened.project.variants?.fileId).toBe(fileB.fileId);
    expect(opened.undo).toBeNull();
    expect(opened.redo).toBeNull();
    expect(opened.notice).toBeNull();
    expect(opened.historyMoves).toBe(moves + 1);
    expect(opened.project.filters).toStrictEqual(filtered.filters);
    expect(opened.project.filtersOff).toStrictEqual(filtered.filtersOff);
    expect(opened.project.individualFilters).toStrictEqual(
      filtered.individualFilters,
    );
    expect(cancelled).toEqual([1]);
    expect(summaryStatus(opened).kind).toBe("locked");
  });
});

/** A request the fake `send` or `sendWrite` was given. */
interface Sent<J> {
  readonly run: Run<never>;
  readonly key: string;
  readonly job: J;
  readonly soFar: ((r: JobResult) => void) | null;
}

/** The store of popgen2.html with fakes of `send` and `sendWrite` that
    record what they were given and never end it; popnei 0.1.0, and
    `panel.vcf.gz` of the individuals s000 and s001 opened and read, with
    the filters of the page's first project. */
function storeOfPanel(): {
  readonly store: Popgen2PageStore<JobResult, Blob>;
  readonly jobs: Sent<Job>[];
  readonly writes: Sent<WriteJob>[];
} {
  const jobs: Sent<Job>[] = [];
  const writes: Sent<WriteJob>[] = [];
  let lastId = 0;
  const runOf = (): Run<never> => {
    lastId += 1;
    return {
      id: lastId,
      outcome: new Promise(() => undefined),
      cancel: () => undefined,
    };
  };
  const store = createPopgen2Store({
    send: (key, job, _onProgress: (p: Progress) => void, onSoFar) => {
      const run = runOf();
      jobs.push({ run, key, job, soFar: onSoFar });
      return run;
    },
    sendWrite: (key, job) => {
      const run = runOf();
      writes.push({ run, key, job, soFar: null });
      return run;
    },
    appVersion: "0.1.0",
  });
  store.popneiReady("0.1.0");
  const load = vcfLoad("c".repeat(32), "panel.vcf.gz");
  openVariantsFile(store, load);
  store.variantsRead(load.fileId, {
    kind: "read",
    individuals: ["s000", "s001"],
    ploidy: 2,
    numVars: null,
    keepsPassed: true,
  });
  return { store, jobs, writes };
}

/** The one pass of s000 and s001, whose missing rates are 0.1 and 0.9. */
function passOfTwo(): VariantsSummaryResult {
  const result = summaryResult(["chr1"], [100]);
  return {
    ...result,
    perIndividual: {
      ...result.perIndividual,
      missingGtRate: Float64Array.of(0.1, 0.9),
    },
  };
}

/** The request `index` of `sent`, or a defect. */
function sentAt<J>(sent: readonly Sent<J>[], index: number): Sent<J> {
  const one = sent[index];
  if (one === undefined) {
    throw new Error(`popnei_web defect: no request ${String(index)} sent`);
  }
  return one;
}

/** The missing data filter of the individuals at `value`. */
function missingOfIndividuals(
  value: number,
): (p: Parameters<typeof setThreshold>[0]) => ReturnType<typeof setThreshold> {
  return (p) =>
    setThreshold(p, { of: "individuals", kind: "missing_data" }, value);
}

describe("DL4 D3 the store of popgen2.html writes, and works out the individuals kept from the one pass", () => {
  test("the write is ready as a .nei file, and startWrite of the VCF sends its WriteJob through sendWrite, under the key of the VCF", () => {
    const { store, jobs, writes } = storeOfPanel();
    const project = store.getState().project;
    expect(store.getState().write).toStrictEqual({
      kind: "ready",
      key: writeKeyOf(project, "nei", "0.1.0", createKeyMemo()),
      format: "nei",
      dropped: false,
    });

    const handles = store.startWrite("vcf");

    const write = sentAt(writes, 0);
    expect(handles).toStrictEqual([write.run]);
    expect(jobs).toHaveLength(0);
    expect(write.key).toBe(
      writeKeyOf(project, "vcf", "0.1.0", createKeyMemo()),
    );
    expect(write.job).toStrictEqual({
      format: "vcf",
      fileId: "c".repeat(32),
      // The filters of popgen2FirstProject: FILTER, and the missing rate
      // of the variants at 0.1.
      filters: [
        { kind: "passed" },
        { kind: "missing_data", maxAllowedMissingRate: 0.1 },
      ],
      individuals: null,
    });
  });

  test("a file written leaves its counts in its state alone, and is kept after its download", () => {
    const { store, writes } = storeOfPanel();
    store.startWrite("vcf");
    const write = sentAt(writes, 0);
    const file: Written<Blob> = {
      format: "vcf",
      file: new Blob(["##fileformat=VCFv4.3"]),
      numBytes: 95_879,
      passStats: {
        numVars: 1152,
        filtering: {
          missing_data: { varsProcessed: 1200, varsKept: 1152 },
        },
      },
    };
    store.runEnded(write.run.id, {
      kind: "done",
      key: write.key,
      result: file,
    });
    expect(store.getState().write).toStrictEqual({
      kind: "done",
      key: keyFromWire(write.key),
      written: file,
    });

    store.writeSaved();

    expect(store.getState().write).toStrictEqual({
      kind: "saved",
      key: keyFromWire(write.key),
      written: file,
    });
    expect(
      store.getState().analyses.map((view) => [view.id, view.status.kind]),
    ).toStrictEqual([
      ["variantsSummary", "ready"],
      // The PCA and the LD decay run with no option typed (the owner,
      // 16 October 2026).
      ["pca", "ready"],
      ["diversity", "ready"],
      ["popDists", "locked"],
      ["ldDecay", "ready"],
    ]);
  });

  test("with a threshold of the individuals, the list needs the one pass while it runs with a result so far, and is known from its perIndividual once it is done", () => {
    const { store, jobs } = storeOfPanel();
    store.apply(
      "the missing data filter of the individuals changed",
      missingOfIndividuals(0.5),
    );
    store.startRun("variantsSummary");
    const pass = sentAt(jobs, 0);
    pass.soFar?.(passOfTwo());
    expect(summaryStatus(store.getState()).kind).toBe("running");
    expect(store.getState().individualsKept?.list).toStrictEqual({
      kind: "needsStatistics",
    });

    store.runEnded(pass.run.id, {
      kind: "done",
      key: pass.key,
      result: passOfTwo(),
    });

    expect(store.getState().individualsKept?.list).toStrictEqual({
      kind: "known",
      individuals: ["s000"],
    });
    expect(store.getState().write).toMatchObject({ kind: "ready" });
  });

  test("the list stays unknown after a Stop of the one pass, with its result so far kept", () => {
    const { store, jobs } = storeOfPanel();
    store.apply(
      "the missing data filter of the individuals changed",
      missingOfIndividuals(0.5),
    );
    store.startRun("variantsSummary");
    const pass = sentAt(jobs, 0);
    pass.soFar?.(passOfTwo());

    store.cancelRun("variantsSummary");
    store.runEnded(pass.run.id, { kind: "cancelled" });

    expect(summaryStatus(store.getState())).toMatchObject({
      kind: "ready",
      stopped: { soFar: { analysis: "variantsSummary" } },
    });
    expect(store.getState().individualsKept?.list).toStrictEqual({
      kind: "needsStatistics",
    });
  });

  test("the write is locked with keptNoneReason when the one pass done keeps no individual", () => {
    const { store, jobs, writes } = storeOfPanel();
    store.apply(
      "the missing data filter of the individuals changed",
      missingOfIndividuals(0.05),
    );
    store.startRun("variantsSummary");
    const pass = sentAt(jobs, 0);

    store.runEnded(pass.run.id, {
      kind: "done",
      key: pass.key,
      result: passOfTwo(),
    });

    expect(store.getState().write).toStrictEqual({
      kind: "locked",
      reason:
        "The filters of individuals keep none of the 2 individuals of panel.vcf.gz. Loosen them.",
    });
    expect(store.startWrite("vcf")).toBeNull();
    expect(writes).toHaveLength(0);
  });

  test("a write asked while the one pass runs waits for it, and sends no second pass: the file is read once", () => {
    const { store, jobs, writes } = storeOfPanel();
    store.apply(
      "the missing data filter of the individuals changed",
      missingOfIndividuals(0.5),
    );
    store.startRun("variantsSummary");
    const pass = sentAt(jobs, 0);

    expect(store.startWrite("vcf")).toStrictEqual([]);
    expect(store.getState().write).toMatchObject({
      kind: "running",
      format: "vcf",
      waitsForStatistics: true,
    });

    const sent = store.runEnded(pass.run.id, {
      kind: "done",
      key: pass.key,
      result: passOfTwo(),
    });

    expect(jobs).toHaveLength(1);
    const write = sentAt(writes, 0);
    expect(sent).toStrictEqual([write.run]);
    expect(write.job.individuals).toStrictEqual(["s000"]);
  });

  test("summaryStatsOf gives the statistics of perIndividual, the same arrays, and is a defect for another result", () => {
    const result = passOfTwo();

    const stats = summaryStatsOf(result);

    expect(stats).toStrictEqual({
      individuals: ["s000", "s001"],
      missingGtRate: result.perIndividual.missingGtRate,
      obsHetRate: result.perIndividual.obsHetRate,
    });
    expect(stats.missingGtRate).toBe(result.perIndividual.missingGtRate);
    expect(() =>
      summaryStatsOf({ analysis: "filterCounts", passStats: result.passStats }),
    ).toThrow(
      /^popnei_web defect: the statistics of each individual were asked of a result of filterCounts/,
    );
  });
});

describe("AP3 D1 the store of popgen2.html stops what a change leaves behind", () => {
  test("a PCA in flight, a threshold moved: its cancel() called at once, and no notice", () => {
    let cancels = 0;
    const jobs: Job[] = [];
    const keys: string[] = [];
    const store = createPopgen2Store({
      send: (key, job): Run<JobResult> => {
        jobs.push(job);
        keys.push(key);
        return {
          id: jobs.length,
          outcome: new Promise<Outcome<JobResult>>(() => undefined),
          cancel: () => {
            if (job.analysis === "pca") cancels += 1;
          },
        };
      },
      sendWrite: () => {
        throw new Error("popnei_web defect: no write is sent here");
      },
      appVersion: "0.1.0",
    });
    store.popneiReady("0.2.2");
    const load = vcfLoad("a".repeat(32), "a.vcf.gz");
    openVariantsFile(store, load);
    store.apply("the distance of the LD pruning changed", (p) =>
      setAnalysisOptions(p, pcaOnPopgen2, {
        ...pcaOnPopgen2.defaults,
        ld: { follow: false, maxAllowedR2: 0.1, maxDist: 50_000 },
      }),
    );
    store.variantsRead(load.fileId, {
      kind: "read",
      individuals: ["s000", "s001"],
      ploidy: 2,
      numVars: null,
      keepsPassed: true,
    });
    const pass = store.startRun("variantsSummary")?.[0];
    if (pass === undefined) throw new Error("the pass was not sent");
    store.runEnded(pass.id, {
      kind: "done",
      key: keys[0] ?? "",
      result: summaryResult(["1"], [1200]),
    });
    store.startRun("pca");
    expect(jobs.map((job) => job.analysis)).toEqual(["variantsSummary", "pca"]);

    store.apply("the filter of the variants by missing data changed", (p) =>
      setThreshold(p, { of: "variants", kind: "missing_data" }, 0.2),
    );

    expect(cancels).toBe(1);
    expect(store.getState().notice).toBeNull();
  });
});

/** A result of the PCA of `s000` and `s001`, from `numVars` variants. */
function pcaOf(numVars: number): JobResult {
  return {
    analysis: "pca",
    method: "pca",
    individuals: ["s000", "s001"],
    numComps: 1,
    numCompsFound: 1,
    projections: Float64Array.from([1, -1]),
    explainedVariancePercent: Float64Array.from([100]),
    numVarsUsed: numVars,
    lingoesConstant: null,
    negativeEigenvaluesPercent: null,
    passStats: { numVars, filtering: {} },
  };
}

/** The store of popgen2.html with a fake worker that records each job,
    its key, and each cancel of a PCA, and ends a job only when the test
    ends it; `a.vcf.gz` open, read, its one pass done, and the LD pruning
    of the PCA given its distance, so that the PCA is ready. */
function storeWithPassDone(): {
  readonly store: Popgen2PageStore<JobResult, Blob>;
  readonly jobs: readonly Job[];
  readonly keys: readonly string[];
  readonly cancels: () => number;
  readonly end: (index: number, result: JobResult) => void;
} {
  let cancels = 0;
  const jobs: Job[] = [];
  const keys: string[] = [];
  const store = createPopgen2Store({
    send: (key, job): Run<JobResult> => {
      jobs.push(job);
      keys.push(key);
      return {
        id: jobs.length,
        outcome: new Promise<Outcome<JobResult>>(() => undefined),
        cancel: () => {
          if (job.analysis === "pca") cancels += 1;
        },
      };
    },
    sendWrite: () => {
      throw new Error("popnei_web defect: no write is sent here");
    },
    appVersion: "0.1.0",
  });
  store.popneiReady("0.2.2");
  const load = vcfLoad("a".repeat(32), "a.vcf.gz");
  openVariantsFile(store, load);
  store.variantsRead(load.fileId, {
    kind: "read",
    individuals: ["s000", "s001"],
    ploidy: 2,
    numVars: null,
    keepsPassed: true,
  });
  const end = (index: number, result: JobResult): void => {
    store.runEnded(index + 1, {
      kind: "done",
      key: keys[index] ?? "",
      result,
    });
  };
  store.startRun("variantsSummary");
  end(0, summaryResult(["1"], [1200]));
  // The distance typed: a step of the history, as the user makes it.
  store.apply("the LD pruning of the PCA changed", (p) =>
    setAnalysisOptions(p, pcaOnPopgen2, {
      ...pcaOnPopgen2.defaults,
      ld: { follow: false, maxAllowedR2: 0.1, maxDist: 50_000 },
    }),
  );
  return { store, jobs, keys, cancels: () => cancels, end };
}

/** The state of the PCA in the store. */
function pcaKind(
  store: Pick<Store<JobResult, Blob>, "getState">,
): string | undefined {
  return store.getState().analyses.find((a) => a.id === "pca")?.status.kind;
}

describe("AP6 D2 the store of popgen2.html with the PCA, a fake worker and the gate", () => {
  test("Run pressed while a run of the arrow keys waits on a threshold: the run is made a change first, and the PCA runs on the new threshold and is not stopped when the second passes", () => {
    vi.useFakeTimers();
    try {
      const { store: plain, keys, cancels } = storeWithPassDone();
      const gate = createRunGate();
      const store = gatedStore(plain, gate);
      const missing = { of: "variants", kind: "missing_data" } as const;
      const run = createThresholdRun({
        gate,
        change: (to) => {
          store.apply(
            "the filter of the variants by missing data changed",
            (p) => setThreshold(p, missing, to),
          );
        },
        ended: () => undefined,
      });

      run.press(0.1, 0.05);
      void startAnalysis(store, "pca");

      expect(run.waiting()).toBe(false);
      expect(pcaKind(store)).toBe("running");
      // The PCA asked under the key of the threshold the run gave.
      const afterRun = keys.at(-1);
      vi.advanceTimersByTime(RUN_QUIET_MS);
      expect(pcaKind(store)).toBe("running");
      expect(cancels()).toBe(0);
      plain.cancelRun("pca");
      store.apply("the filter of the variants by missing data changed", (p) =>
        setThreshold(p, missing, 0.1),
      );
      void startAnalysis(store, "pca");
      expect(keys.at(-1)).not.toBe(afterRun);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("NU2 D1 the store of popgen2.html has no Undo, keeps one past project and drops what a change leaves behind", () => {
  test("it has neither undo nor redo, in its type nor at run time", () => {
    const { store } = storeWithPassDone();
    // @ts-expect-error -- the page's store has no undo
    const undo: unknown = store.undo;
    // @ts-expect-error -- nor redo
    const redo: unknown = store.redo;
    expect([undo, redo]).toEqual([undefined, undefined]);
    expect(["undo" in store, "redo" in store]).toEqual([false, false]);
  });

  test("its history keeps one past project: after three commands one undo leaves nothing to undo, and a second changes nothing", () => {
    // The store made with the page's settings, with the undo the page's
    // store does not give, as only a test reaches it.
    const store = createStore(
      popgen2StoreConfig({
        send: () => {
          throw new Error("popnei_web defect: no request is sent here");
        },
        sendWrite: () => {
          throw new Error("popnei_web defect: no write is sent here");
        },
        appVersion: "0.1.0",
      }),
    );
    for (const value of [0.2, 0.3, 0.4]) {
      store.apply("the MAF filter changed", (p) =>
        setThreshold(p, { of: "variants", kind: "maf" }, value),
      );
    }

    store.undo();

    expect(store.getState().undo).toBeNull();
    const project = store.getState().project;
    store.undo();
    expect(store.getState().project).toBe(project);
  });

  test("a PCA done, a threshold moved and set back by a command: ready, not done, and no request sent", () => {
    const { store, jobs, end } = storeWithPassDone();
    store.startRun("pca");
    end(1, pcaOf(548));
    expect(pcaKind(store)).toBe("done");
    const missing = { of: "variants", kind: "missing_data" } as const;

    store.apply("the filter of the variants by missing data changed", (p) =>
      setThreshold(p, missing, 0.2),
    );
    store.apply("the filter of the variants by missing data changed", (p) =>
      setThreshold(p, missing, 0.1),
    );

    expect(pcaKind(store)).toBe("ready");
    expect(store.getState().notice).toBeNull();
    expect(jobs.map((job) => job.analysis)).toEqual(["variantsSummary", "pca"]);
  });
});
