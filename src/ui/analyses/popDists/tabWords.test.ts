/**
 * The words of the Distances tab of popgen2.html
 * (docs/specs/steps/popgen2-distances.md, "The populations it runs on",
 * "Run and Stop", "The result" and "Its words"), and the CSV of its
 * heatmap and of its table.
 */
import { describe, expect, test } from "vitest";

import type { IndividualsKept } from "../../../core/individualsKept.ts";
import type { Project } from "../../../core/project.ts";
import { deepFreeze } from "../../../core/testSupport.ts";
import type {
  Cell,
  IndividualsTable,
  PopDistsResult,
} from "../../../worker/protocol.ts";
import {
  DISTANCES_TAB_LOADING,
  DISTANCES_TAB_TITLE,
  distancesTabFailed,
} from "./tabLoadWords.ts";
import {
  distancesPanelLive,
  distancesStoppedLine,
  distancesTabLock,
  distancesTabReadyLines,
  distancesWaitingLine,
  heatmapFiles,
  heatmapWhat,
  matrixCsv,
  pairsCsv,
  unclassifiedCaption,
  DISTANCES_TABLE_WHAT,
} from "./tabWords.ts";

/** A project of popgen2.html, frozen deeply: `panel.nei` with the
    individuals of `names`, each with its population in `pops` in
    `panel_pops.csv`, the minimum `min`. */
function project(
  names: readonly string[],
  pops: readonly Cell[],
  min: number,
  inVariants: readonly string[] = names,
): Project {
  const table: IndividualsTable = {
    columns: ["IID", "popcat"],
    rows: names.map((name, i) => [name, pops[i] ?? null]),
  };
  return deepFreeze<Project>({
    app: "popgen",
    variants: {
      fileId: "00112233445566778899aabbccddeeff",
      name: "panel.nei",
      size: 261_490,
      format: "nei",
      readOptions: null,
      read: {
        kind: "read",
        individuals: inVariants,
        ploidy: 2,
        numVars: null,
        keepsPassed: false,
      },
    },
    filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.1 }],
    filtersOff: [],
    individualFilters: [],
    individualFiltersOff: [],
    individuals: {
      fileId: "ffeeddccbbaa99887766554433221100",
      name: "panel_pops.csv",
      csv: { encoding: "auto", separator: "auto", decimal: "auto" },
      typesSet: [],
      read: {
        kind: "read",
        table,
        columns: [{ kind: "identifier" }, { kind: "categorical" }],
        found: {
          encoding: "utf-8",
          separator: ",",
          decimal: ".",
          undecodedLine: null,
        },
      },
    },
    grouping: { kind: "populations", column: "popcat" },
    analyses: [
      {
        analysis: "popDists",
        options: { minNumIndividuals: min, measure: "fst" },
      },
    ],
    reference: null,
  });
}

/** Individuals s000, s001, … of populations of the sizes `sizes`, p0,
    p1, …, and `unclassified` more of none. */
function sized(
  sizes: readonly number[],
  unclassified = 0,
): { readonly names: string[]; readonly pops: Cell[] } {
  const names: string[] = [];
  const pops: Cell[] = [];
  const add = (pop: Cell): void => {
    names.push(`s${String(names.length).padStart(3, "0")}`);
    pops.push(pop);
  };
  for (const [pop, size] of sizes.entries()) {
    for (let i = 0; i < size; i++) add(`p${String(pop)}`);
  }
  for (let i = 0; i < unclassified; i++) add(null);
  return { names, pops };
}

/** The individuals kept of `names`: known, `list`, or waiting for the
    one pass. */
function keptOf(
  names: readonly string[],
  list: readonly string[] | null | "waiting",
): IndividualsKept {
  return {
    byLists: names,
    list:
      list === "waiting"
        ? { kind: "needsStatistics" }
        : { kind: "known", individuals: list },
    counts: [],
  };
}

/** The result of the flow, the numbers of popDists.md at 0.1, ordered
    p2, p0, p1 by both measures. */
function flowResult(): PopDistsResult {
  const order = { kind: "pcoa", order: Uint32Array.from([1, 0, 2]) } as const;
  return {
    analysis: "popDists",
    pops: ["p0", "p2", "p1"],
    numIndividuals: Uint32Array.from([48, 84, 68]),
    fst: Float64Array.from([
      0.10273588423661377, 0.10496244498389443, 0.10962148955018115,
    ]),
    dest: Float64Array.from([
      0.06129813142463423, 0.06354346296076403, 0.06567052128821259,
    ]),
    numVarsPerPair: Uint32Array.from([1200, 1200, 1200]),
    order: { fst: order, dest: order },
    leftOut: [],
    passStats: {
      numVars: 1200,
      filtering: { missing_data: { varsProcessed: 1200, varsKept: 1200 } },
    },
  };
}

describe("DT1 D3 the words of the Distances tab", () => {
  test("the heading, the line while the code downloads and its failure", () => {
    expect(DISTANCES_TAB_TITLE).toBe("Distances between populations");
    expect(DISTANCES_TAB_LOADING).toBe("Loading the Distances tab…");
    expect(distancesTabFailed("panel.nei")).toBe(
      "The Distances tab could not be loaded. Press Try again. If it fails again, the site may have been updated since this page was opened: reload the page and open panel.nei again; what the page has calculated is lost.",
    );
  });

  test("the lines of the populations: those with the minimum, one under it, the unclassified", () => {
    const { names, pops } = sized([3, 2, 1], 2);
    expect(
      distancesTabReadyLines(project(names, pops, 2), keptOf(names, null)),
    ).toEqual([
      "2 populations: p0, 3 individuals; p1, 2 individuals",
      "p2 has 1 individual, fewer than the minimum of 2, and is left out.",
      "2 unclassified individuals kept are left out, as the box Individuals says.",
    ]);
  });

  test("the lines: one unclassified, a population emptied by the thresholds, the thresholds waiting", () => {
    const { names, pops } = sized([2, 2, 2], 1);
    const p = project(names, pops, 1);
    expect(
      distancesTabReadyLines(
        p,
        keptOf(names, ["s000", "s001", "s002", "s003", "s006"]),
      ),
    ).toEqual([
      "2 populations: p0, 2 individuals; p1, 2 individuals",
      "1 unclassified individual kept is left out, as the box Individuals says.",
      "p2 has no individual left after the thresholds of the individuals, and is left out. Loosen the thresholds of the individuals in the Variants tab to keep it.",
    ]);
    expect(distancesTabReadyLines(p, keptOf(names, "waiting")).at(-1)).toBe(
      "The thresholds of the individuals may take individuals from them once panel.nei is read to the end.",
    );
  });

  test("no lines for one population, which greys the tab", () => {
    const { names, pops } = sized([3]);
    expect(
      distancesTabReadyLines(project(names, pops, 1), keptOf(names, null)),
    ).toEqual([]);
  });

  test("the lock of the one pass names the distances", () => {
    const { names, pops } = sized([3, 3]);
    expect(distancesTabLock(project(names, pops, 1), "reading")).toBe(
      "Run once panel.nei is read to the end: the reading under way in the box Variants and the distances cannot run at once.",
    );
    expect(distancesTabLock(project(names, pops, 1), null)).toBeNull();
  });

  test("the line in the place of the bar, by what they wait for", () => {
    expect(distancesWaitingLine("changes", null)).toBe(
      "The distances start in a moment, later if the filters, their options or the populations change.",
    );
    expect(distancesWaitingLine("changes", "the diversity")).toBe(
      "The distances start after the diversity, once the filters, the options and the populations stop changing.",
    );
    expect(distancesWaitingLine("behind", "the PCA")).toBe(
      "The distances start once the PCA, which is running, ends.",
    );
    expect(distancesWaitingLine("behind", null)).toBe(
      "The distances start in a moment, later if the filters, their options or the populations change.",
    );
    expect(distancesWaitingLine("download", null)).toBe(
      "The distances start again when the download is written or closed.",
    );
    expect(distancesWaitingLine("afterCrash", null)).toBe(
      "The distances start after the next change of the filters, of their options or of the populations, or when Run is pressed.",
    );
  });

  test("the line of a Stop, and the panel's live state", () => {
    expect(distancesStoppedLine(false)).toBe(
      "Stopped: the distances no longer start by themselves after a change. Run calculates them and starts them again after each change.",
    );
    expect(distancesStoppedLine(true)).toBe(
      "Stopped: the distances no longer start by themselves after a change. After the next change, Run calculates them and starts them again after each change.",
    );
    expect(distancesPanelLive({ kind: "off" }, null, false)).toEqual({
      kind: "off",
    });
    expect(distancesPanelLive({ kind: "endedByFailure" }, null, false)).toEqual(
      {
        kind: "stopped",
        line: "The distances no longer start by themselves after a change, since their calculation failed. Run calculates them and starts them again after each change.",
      },
    );
    expect(
      distancesPanelLive(
        {
          kind: "live",
          aboutToStart: "afterCrash",
          running: false,
          after: null,
        },
        null,
        false,
      ),
    ).toEqual({
      kind: "live",
      aboutToStartLine:
        "The distances start after the next change of the filters, of their options or of the populations, or when Run is pressed.",
      runBeside: true,
    });
  });

  test("the caption of the unclassified, and what each download names", () => {
    expect(unclassifiedCaption(7)).toBe(
      "7 unclassified individuals kept are left out.",
    );
    expect(unclassifiedCaption(1)).toBe(
      "1 unclassified individual kept is left out.",
    );
    expect(DISTANCES_TABLE_WHAT).toBe("the table of the distances");
    expect(heatmapWhat("fst")).toBe("the heatmap of Hudson's Fst");
    expect(heatmapWhat("dest")).toBe("the heatmap of Jost's D");
    expect(heatmapFiles("fst")).toBe("popdists.fst_hudson");
    expect(heatmapFiles("dest")).toBe("popdists.jost_d");
  });

  test("the CSV of the heatmap: the square matrix in its order, empty on the diagonal", () => {
    expect(matrixCsv(flowResult(), "fst")).toBe(
      [
        "Population,p2,p0,p1",
        "p2,,0.10273588423661377,0.10962148955018115",
        "p0,0.10273588423661377,,0.10496244498389443",
        "p1,0.10962148955018115,0.10496244498389443,",
        "",
      ].join("\n"),
    );
  });

  test("the CSV of the table: two columns of populations, the values as stored", () => {
    expect(pairsCsv(flowResult())).toBe(
      [
        "First population,Second population,Hudson's Fst,Jost's D,Variants",
        "p0,p2,0.10273588423661377,0.06129813142463423,1200",
        "p0,p1,0.10496244498389443,0.06354346296076403,1200",
        "p2,p1,0.10962148955018115,0.06567052128821259,1200",
        "",
      ].join("\n"),
    );
  });

  test("the CSVs quote a name with a comma or a quote, and put a quote before a formula", () => {
    const r: PopDistsResult = {
      ...flowResult(),
      pops: ['a,"b"', "=p1"],
      numIndividuals: Uint32Array.from([20, 20]),
      fst: Float64Array.from([Number.NaN]),
      dest: Float64Array.from([0.5]),
      numVarsPerPair: Uint32Array.from([0]),
      order: {
        fst: { kind: "file", reason: "twoPopulations" },
        dest: { kind: "file", reason: "twoPopulations" },
      },
    };
    expect(pairsCsv(r)).toBe(
      [
        "First population,Second population,Hudson's Fst,Jost's D,Variants",
        `"a,""b""",'=p1,,0.5,0`,
        "",
      ].join("\n"),
    );
    expect(matrixCsv(r, "fst")).toBe(
      [`Population,"a,""b""",'=p1`, `"a,""b""",,`, `'=p1,,`, ""].join("\n"),
    );
  });
});
