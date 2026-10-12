/**
 * What the frames of the analyses read of a state of the store: the
 * result of an analysis once done, narrowed to its own kind, and the
 * notice that stopped its calculation.
 */
import { describe, expect, test } from "vitest";

import { keyFromWire } from "../../core/keys.ts";
import type { AnalysisStatus, Notice } from "../../core/store.ts";
import type { FilterCountsResult, JobResult } from "../../worker/protocol.ts";
import { pcaOnPopgen2 } from "../../core/analyses/pca.ts";
import { setAnalysisOptions } from "../../core/project.ts";
import { createPopgen2Store } from "../popgen2Store.ts";
import {
  liveAnalysisOf,
  resultOf,
  runningAnalysisOf,
  stoppedNotice,
} from "./status.ts";

const KEY = keyFromWire("a".repeat(64));

const COUNTS: FilterCountsResult = {
  analysis: "filterCounts",
  passStats: { numVars: 1200, filtering: {} },
};

function done(result: JobResult): AnalysisStatus<JobResult> {
  return { kind: "done", key: KEY, result, warnings: [], check: null };
}

const READY: AnalysisStatus<JobResult> = {
  kind: "ready",
  key: KEY,
  stopped: null,
};

function stopping(stopped: Notice["stopped"]): Notice {
  return {
    cause: { kind: "command", description: "a new variants file was loaded" },
    removed: [],
    leftBehind: [],
    stopped,
    writeLeftBehind: false,
    writeStopped: false,
    writeDiscarded: false,
  };
}

describe("the result and the stop of an analysis, for its frame", () => {
  test("resultOf gives the result of a state done, the same object, and null in another state", () => {
    expect(resultOf(done(COUNTS), "filterCounts")).toBe(COUNTS);
    expect(resultOf(READY, "filterCounts")).toBeNull();
  });

  test("resultOf of a state done with the result of another analysis is a defect", () => {
    expect(() => resultOf(done(COUNTS), "variantChecks")).toThrow(
      "popnei_web defect: variantChecks was given a result of filterCounts.",
    );
  });

  test("stoppedNotice gives the notice that stopped the analysis while it can run again, and null otherwise", () => {
    const notice = stopping(["filterCounts"]);
    expect(stoppedNotice(READY, notice, "filterCounts")).toBe(notice);
    expect(stoppedNotice(READY, notice, "variantChecks")).toBeNull();
    expect(stoppedNotice(done(COUNTS), notice, "filterCounts")).toBeNull();
    expect(stoppedNotice(READY, null, "filterCounts")).toBeNull();
  });
});

describe("PT1 D7 the live analyses of popgen2.html as the words name them", () => {
  /** The store of popgen2.html, with a worker that is never sent
      anything. */
  function page(): ReturnType<typeof createPopgen2Store> {
    return createPopgen2Store({
      send: () => {
        throw new Error("nothing is sent");
      },
      sendWrite: () => {
        throw new Error("nothing is written");
      },
      appVersion: "0.1.0",
    });
  }

  test("liveAnalysisOf names the PCA by its method, in the PCA tab, and the diversity in the Populations tab, the same object each time", () => {
    const store = page();
    const state = store.getState();
    expect(liveAnalysisOf(state, "pca")).toStrictEqual({
      id: "pca",
      name: "the PCA",
      tab: "PCA",
      readsPopulations: false,
      plural: false,
    });
    expect(liveAnalysisOf(state, "diversity")).toStrictEqual({
      id: "diversity",
      name: "the diversity",
      tab: "Populations",
      readsPopulations: true,
      plural: false,
    });
    expect(liveAnalysisOf(state, "diversity")).toBe(
      liveAnalysisOf(state, "diversity"),
    );
    store.apply("the method of the PCA changed", (p) =>
      setAnalysisOptions(p, pcaOnPopgen2, {
        ...pcaOnPopgen2.defaults,
        method: "pcoa",
      }),
    );
    expect(liveAnalysisOf(store.getState(), "pca").name).toBe("the PCoA");
    expect(runningAnalysisOf(store.getState())).toBeNull();
  });

  test("liveAnalysisOf of an analysis that is not live on popgen2.html is a defect", () => {
    expect(() => liveAnalysisOf(page().getState(), "variantsSummary")).toThrow(
      "popnei_web defect: variantsSummary is not an analysis popgen2.html calculates again by itself.",
    );
  });
});
