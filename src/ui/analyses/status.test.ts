/**
 * What the frames of the analyses read of a state of the store: the
 * result of an analysis once done, narrowed to its own kind, and the
 * notice that stopped its calculation.
 */
import { describe, expect, test } from "vitest";

import { keyFromWire } from "../../core/keys.ts";
import type { AnalysisStatus, Notice } from "../../core/store.ts";
import type { FilterCountsResult, JobResult } from "../../worker/protocol.ts";
import { resultOf, stoppedNotice } from "./status.ts";

const KEY = keyFromWire("a".repeat(64));

const COUNTS: FilterCountsResult = {
  analysis: "filterCounts",
  passStats: { numVars: 1200, filtering: {} },
};

function done(result: JobResult): AnalysisStatus<JobResult> {
  return { kind: "done", key: KEY, result, warnings: [], check: null };
}

const READY: AnalysisStatus<JobResult> = { kind: "ready", key: KEY };

function stopping(stopped: Notice["stopped"]): Notice {
  return {
    cause: { kind: "command", description: "a new variants file was loaded" },
    removed: [],
    leftBehind: [],
    stopped,
    writeLeftBehind: false,
    writeStopped: false,
    writeDiscarded: false,
    filtersChanged: false,
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
