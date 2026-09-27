import { describe, expect, test } from "vitest";

import { POPGEN_ANALYSES, firstProject } from "../../core/apps.ts";
import { keyFromWire } from "../../core/keys.ts";
import type { AnalysisView, AppState } from "../../core/store.ts";
import type { JobResult } from "../../worker/protocol.ts";
import { SHELL_WORDS } from "./titles.ts";

// The words of the shell of the page (docs/specs/shell.md, "What it sends
// and reads"): the titles of the analyses, the steps of apps.ts, and the
// variants kept from the Counts of the filters.

/** A state whose analyses are `views`, and nothing else the words read. */
function stateWith(
  views: readonly AnalysisView<JobResult>[],
): AppState<JobResult, unknown> {
  return {
    project: firstProject("popgen"),
    undo: null,
    redo: null,
    popneiVersion: "0.1.0",
    analyses: views,
    runs: [],
    notice: null,
    individualsKept: null,
    write: null,
  };
}

const KEY = keyFromWire("0".repeat(64));

describe("VS5 D1 the words of the shell of the page", () => {
  test("each analysis is named by the title of its panel or of its part of the Variants step", () => {
    expect(POPGEN_ANALYSES.map((def) => SHELL_WORDS.title(def.id))).toEqual([
      "Statistics of each individual",
      "Histograms of the variants",
      "Counts of the filters",
      "Diversity",
    ]);
  });

  test("the checks are in the Variants step and the diversity in the Analyses step, and an analysis of no step is a defect", () => {
    expect(POPGEN_ANALYSES.map((def) => SHELL_WORDS.stepOf(def.id))).toEqual([
      "variants",
      "variants",
      "variants",
      "analyses",
    ]);
    expect(() => SHELL_WORDS.stepOf("pca")).toThrow(/^popnei_web defect:/);
  });

  test("the variants kept are those the Counts of the filters kept when they are done, and null otherwise", () => {
    const done: AnalysisView<JobResult> = {
      id: "filterCounts",
      status: {
        kind: "done",
        key: KEY,
        result: {
          analysis: "filterCounts",
          passStats: {
            numVars: 1128,
            filtering: {
              missing_data: { varsProcessed: 1200, varsKept: 1128 },
            },
          },
        },
        warnings: [],
        check: null,
      },
    };
    expect(SHELL_WORDS.variantsKept(stateWith([done]))).toBe(1128);
    expect(
      SHELL_WORDS.variantsKept(
        stateWith([
          { id: "filterCounts", status: { kind: "ready", key: KEY } },
        ]),
      ),
    ).toBeNull();
  });
});
