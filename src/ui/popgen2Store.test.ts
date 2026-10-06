import { describe, expect, test } from "vitest";

import { loadVariants } from "../core/project.ts";
import type { Job, JobResult, Outcome, Run } from "../worker/protocol.ts";
import { POPGEN2_AUTO_GROUPS, createPopgen2Store } from "./popgen2Store.ts";

// The store of popgen2.html as its entry makes it, with a fake `send`
// that records the jobs and never ends them.

describe("the store of popgen2.html", () => {
  test("the page starts the summary by itself, whose one pass gives the statistics too", () => {
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
    });

    store.startRun("variantsSummary");

    expect(jobs).toEqual([
      {
        analysis: "variantsSummary",
        fileId,
        filters: [],
        minNumIndividuals: 0,
        numBins: 1280,
        range: [0, 1],
      },
    ]);
    expect(store.getState().analyses.map((a) => a.id)).toEqual([
      "variantsSummary",
    ]);
  });
});
