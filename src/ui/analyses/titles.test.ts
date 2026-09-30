import { describe, expect, test } from "vitest";

import { POPGEN_ANALYSES, firstProject } from "../../core/apps.ts";
import { keyFromWire } from "../../core/keys.ts";
import type { Key } from "../../core/keys.ts";
import type { AnalysisStatus, AppState, RunView } from "../../core/store.ts";
import type { JobResult } from "../../worker/protocol.ts";
import { announcementsOf } from "../shell/words.ts";
import { SHELL_WORDS } from "./titles.ts";

// The words of the shell of the page (docs/specs/shell.md, "What it sends
// and reads"): the titles of the analyses and the steps of apps.ts; the
// variants kept are tested in src/core/apps.test.ts.

describe("VS5 D1 the words of the shell of the page", () => {
  test("each analysis is named by the title of its panel or of its part of the Variants step", () => {
    expect(POPGEN_ANALYSES.map((def) => SHELL_WORDS.title(def.id))).toEqual([
      "Statistics of each individual",
      "Histograms of the variants",
      "Counts of the filters",
      "Principal components",
      "Diversity",
      "Distances between populations",
      "LD decay",
    ]);
  });

  test("the checks are in the Variants step and the principal components, the diversity, the distances between populations and the LD decay in the Analyses step, and an analysis of no step is a defect", () => {
    expect(POPGEN_ANALYSES.map((def) => SHELL_WORDS.stepOf(def.id))).toEqual([
      "variants",
      "variants",
      "variants",
      "analyses",
      "analyses",
      "analyses",
      "analyses",
    ]);
    expect(() => SHELL_WORDS.stepOf("tsne")).toThrow(/^popnei_web defect:/);
  });

  test("an analysis with no title is a defect", () => {
    expect(() => SHELL_WORDS.title("tsne")).toThrow(/^popnei_web defect:/);
  });

  test("stop A 6 the titles of the diversity and the LD decay name one thing, and the others several, after which the status region says were", () => {
    expect(POPGEN_ANALYSES.map((def) => SHELL_WORDS.plural(def.id))).toEqual([
      true,
      true,
      true,
      true,
      false,
      true,
      false,
    ]);
    expect(() => SHELL_WORDS.plural("tsne")).toThrow(/^popnei_web defect:/);
  });
});

/** A state of the store with the distances between populations alone, in
    the state `status`, and the requests `runs`. */
function distancesState(
  status: AnalysisStatus<JobResult>,
  runs: readonly RunView[],
): AppState<JobResult, unknown> {
  return {
    project: firstProject("popgen"),
    undo: null,
    redo: null,
    historyMoves: 0,
    popneiVersion: "0.1.0",
    analyses: [{ id: "popDists", status }],
    runs,
    notice: null,
    individualsKept: null,
    write: null,
  };
}

const KEY_D: Key = keyFromWire("d".repeat(64));
const KEY_S: Key = keyFromWire("c".repeat(64));

describe("PA5 D1 the words of the shell for the distances between populations", () => {
  test("the title is Distances between populations, which names several things, in the Analyses step", () => {
    expect(SHELL_WORDS.title("popDists")).toBe("Distances between populations");
    expect(SHELL_WORDS.plural("popDists")).toBe(true);
    expect(SHELL_WORDS.stepOf("popDists")).toBe("analyses");
  });

  test("the status region says the distances are calculating, and, after the statistics they waited for, that they were not run, with the plural verb", () => {
    const run: RunView = {
      runId: 1,
      analysis: "popDists",
      key: KEY_D,
      current: true,
      stopping: false,
      afterStop: false,
      progress: null,
    };
    expect(
      announcementsOf(
        distancesState({ kind: "ready", key: KEY_D }, []),
        distancesState(
          {
            kind: "running",
            key: KEY_D,
            runId: 1,
            progress: null,
            waitsForStatistics: false,
          },
          [run],
        ),
        SHELL_WORDS,
      ),
    ).toEqual(["Distances between populations: calculating."]);

    const statistics: RunView = {
      ...run,
      runId: 2,
      analysis: "individualChecks",
      key: KEY_S,
    };
    const reason =
      "Only p1 has 20 individuals or more among the individuals the filters keep, and a variant counts for a pair of populations only where both have 20 individuals with a called genotype, so no pair has a distance. Lower the minimum of individuals below, merge populations in the metadata file, or loosen the filters of individuals in the Variants step.";
    expect(
      announcementsOf(
        distancesState(
          {
            kind: "running",
            key: KEY_D,
            runId: 2,
            progress: null,
            waitsForStatistics: true,
          },
          [statistics],
        ),
        distancesState({ kind: "locked", reason }, []),
        SHELL_WORDS,
      ),
    ).toEqual([`Distances between populations were not run. ${reason}`]);
  });
});
