/**
 * The commands of the options of the distances between populations, and
 * what a change of the measure announces in each state of the panel
 * (docs/specs/analyses/popDists.md, "What it sends and reads" and
 * "Accessibility"), on the sample project of core.
 */
import { describe, expect, test } from "vitest";

import { popDistsOptions } from "../../../core/analyses/popDists.ts";
import type { Key } from "../../../core/keys.ts";
import type { AnalysisStatus } from "../../../core/store.ts";
import { sampleProject } from "../../../core/testSupport.ts";
import type { JobResult, PopDistsResult } from "../../../worker/protocol.ts";
import { measureCommand, minimumCommand } from "./commands.ts";
import { measureAnnouncement } from "./words.ts";

/** A key of a result, as the store gives one. */
const KEY = "a key of the tests" as Key;

/** A result of `numPops` populations in the order of the file. */
function resultOf(numPops: number): PopDistsResult {
  const numPairs = (numPops * (numPops - 1)) / 2;
  const order = { kind: "file", reason: "twoPopulations" } as const;
  return {
    analysis: "popDists",
    pops: Array.from({ length: numPops }, (_, i) => `q${String(i)}`),
    numIndividuals: new Uint32Array(numPops).fill(2),
    fst: new Float64Array(numPairs).fill(0.1),
    dest: new Float64Array(numPairs).fill(0.06),
    numVarsPerPair: new Uint32Array(numPairs).fill(100),
    order: { fst: order, dest: order },
    leftOut: [],
    passStats: { numVars: 100, filtering: {} },
  };
}

/** The panel done with a result of `numPops` populations. */
function done(numPops: number): AnalysisStatus<JobResult> {
  return {
    kind: "done",
    key: KEY,
    result: resultOf(numPops),
    warnings: [],
    check: null,
  };
}

describe("PA5 D1 the commands of the options of the distances", () => {
  test("the minimum is set with the measure kept, and names the change that removes the result", () => {
    const measured = measureCommand("dest").command(sampleProject());
    const step = minimumCommand(12);
    expect(step.description).toBe(
      "the minimum number of individuals of the distances changed",
    );
    expect(popDistsOptions(step.command(measured))).toEqual({
      minNumIndividuals: 12,
      measure: "dest",
    });
  });

  test("the measure is set with the minimum kept, and names the change", () => {
    const small = minimumCommand(5).command(sampleProject());
    const step = measureCommand("dest");
    expect(step.description).toBe("the distance the heatmap draws changed");
    expect(popDistsOptions(step.command(small))).toEqual({
      minNumIndividuals: 5,
      measure: "dest",
    });
  });

  test("the options of one project are one object, and the defaults with none set", () => {
    const p = minimumCommand(5).command(sampleProject());
    expect(popDistsOptions(p)).toBe(popDistsOptions(p));
    expect(popDistsOptions(sampleProject())).toEqual({
      minNumIndividuals: 20,
      measure: "fst",
    });
  });
});

describe("PA5 D1 a change of the measure is announced only over a heatmap", () => {
  test("done with 200 populations or fewer, the heatmap of the measure", () => {
    expect(measureAnnouncement(done(3), "dest")).toBe("Heatmap of Jost's D");
    expect(measureAnnouncement(done(200), "fst")).toBe(
      "Heatmap of Hudson's Fst",
    );
  });

  test("nothing above 200 populations, and in every state with no result", () => {
    expect(measureAnnouncement(done(201), "dest")).toBeNull();
    const states: readonly AnalysisStatus<JobResult>[] = [
      { kind: "locked", reason: "no" },
      { kind: "ready", key: KEY },
      { kind: "removed", key: KEY },
      {
        kind: "running",
        key: KEY,
        runId: 1,
        progress: null,
        waitsForStatistics: false,
        soFar: null,
      },
      {
        kind: "error",
        key: KEY,
        error: { kind: "refused", message: "no" },
        ofStatistics: false,
        waited: false,
      },
    ];
    for (const status of states) {
      expect(measureAnnouncement(status, "dest")).toBeNull();
    }
  });
});
