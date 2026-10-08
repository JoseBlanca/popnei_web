import { describe, expect, test } from "vitest";

import { firstProject, popgen2FirstProject } from "../core/apps.ts";
import {
  loadVariants,
  setThreshold,
  turnOffVariantFilter,
} from "../core/project.ts";
import type { VariantLoad } from "../core/project.ts";
import { summaryResult } from "../core/testSupport.ts";
import type { Job, JobResult, Outcome, Run } from "../worker/protocol.ts";
import {
  POPGEN2_AUTO_GROUPS,
  createPopgen2Store,
  openVariantsFile,
} from "./popgen2Store.ts";
import { startAnalysis } from "./runs.ts";
import { summaryStatus } from "./variants/words.ts";

// The store of popgen2.html as its entry makes it, with a fake `send`
// that records the jobs and never ends them.

describe("the store of popgen2.html", () => {
  test("one-pass the page starts by itself the summary alone, whose one pass gives the statistics too, one group", () => {
    expect(POPGEN2_AUTO_GROUPS).toEqual([["variantsSummary"]]);
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
      [["variantsSummary", "running"]],
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
  test("the first file and another leave nothing to undo or redo, keep the filters as the user left them, stop the pass of the file before and give no notice", () => {
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
    store.undo();
    expect(store.getState().undo).toBe(
      "the variants that failed their FILTER are kept",
    );
    expect(store.getState().redo).toBe("the MAF filter changed");
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
    store.undo();
    expect(store.getState()).toBe(opened);
  });
});
