/**
 * The words of the Populations tab of popgen2.html that task 1.3 of
 * docs/plans/population-tab.md draws (docs/specs/steps/
 * popgen2-populations.md, "The populations it runs on", "Run and Stop",
 * "The result" and "Its words"): the line of the populations with the
 * unclassified left out and with the one population, the locks of the
 * one pass, the line of a Stop, the caption's sentence of the
 * unclassified and the words of a result whose code could not be
 * downloaded.
 */
import { describe, expect, test } from "vitest";

import type { IndividualsKept } from "../../../core/individualsKept.ts";
import {
  loadIndividuals,
  emptyProject,
  setGrouping,
  setIndividualFilter,
} from "../../../core/project.ts";
import type { Project } from "../../../core/project.ts";
import { deepFreeze } from "../../../core/testSupport.ts";
import {
  DIVERSITY_AFTER_CRASH_LINE,
  DIVERSITY_FAILURE_ENDED_LINE,
  DIVERSITY_STOPPED_LINE,
  diversityPanelLive,
  diversityTabLock,
  diversityTabReadyLines,
  diversityWaitingLine,
} from "./tabWords.ts";
import { unclassifiedCaption, unclassifiedLeftOutOf } from "./resultWords.ts";
import {
  POPULATIONS_TAB_LOADING,
  populationsTabFailed,
} from "./tabLoadWords.ts";

/** The ten individuals of the variants file, s000 to s009. */
const INDIVIDUALS = Array.from({ length: 10 }, (_, i) => `s00${String(i)}`);

/** A project of popgen2.html with the variants file `panel.nei` of
    INDIVIDUALS read, diploid, and, given `rows`, the individuals file
    `pops.csv` of those rows, `[name, pop]`, read, with `pop` chosen when
    `column` is true. */
function projectOf(
  rows: readonly (readonly [string, string | null])[] | null,
  column = true,
): Project {
  const base: Project = {
    ...emptyProject("popgen"),
    variants: {
      fileId: "a".repeat(32),
      name: "panel.nei",
      size: 1000,
      format: "nei",
      readOptions: null,
      read: {
        kind: "read",
        individuals: INDIVIDUALS,
        ploidy: 2,
        numVars: null,
        keepsPassed: false,
      },
    },
  };
  if (rows === null) return deepFreeze(base);
  const loaded = loadIndividuals(base, {
    fileId: "b".repeat(32),
    name: "pops.csv",
    csv: { encoding: "auto", separator: "auto", decimal: "auto" },
  });
  if (loaded.individuals === null) throw new Error("no individuals file");
  const read: Project = {
    ...loaded,
    individuals: {
      ...loaded.individuals,
      read: {
        kind: "read",
        table: {
          columns: ["id", "pop"],
          rows: rows.map(([name, pop]) => [name, pop]),
        },
        columns: [{ kind: "identifier" }, { kind: "categorical" }],
        found: {
          encoding: "utf-8",
          separator: ",",
          decimal: ".",
          undecodedLine: null,
        },
      },
    },
  };
  return deepFreeze(
    column
      ? setGrouping(read, { kind: "populations", column: "pop" })
      : setGrouping(read, { kind: "populations", column: null }),
  );
}

/** The individuals kept, `individuals` or every one for `null`, known. */
function keptOf(individuals: readonly string[] | null): IndividualsKept {
  return {
    list: { kind: "known", individuals },
    byLists: individuals ?? INDIVIDUALS,
    counts: [],
  };
}

/** s000 to s003 in A, s004 to s007 in B, s008 with an empty cell, and
    s009 not in the file. */
const ROWS: readonly (readonly [string, string | null])[] = [
  ["s000", "A"],
  ["s001", "A"],
  ["s002", "A"],
  ["s003", "A"],
  ["s004", "B"],
  ["s005", "B"],
  ["s006", "B"],
  ["s007", "B"],
  ["s008", null],
];

describe("PT1 D3 the words of the Populations tab", () => {
  test("the line of the populations names those of the column and says how many unclassified are left out", () => {
    const p = projectOf(ROWS);
    const lines = diversityTabReadyLines(p, keptOf(null));
    expect(lines[0]).toBe("2 populations: A, 4 individuals; B, 4 individuals");
    expect(lines[1]).toBe(
      "2 unclassified individuals kept are left out, as the box Individuals says.",
    );
    expect(unclassifiedLeftOutOf(p, keptOf(null))).toBe(2);
    // Only the unclassified kept count: s009 removed, s008 kept.
    const someKept = keptOf(INDIVIDUALS.filter((name) => name !== "s009"));
    expect(diversityTabReadyLines(p, someKept)[1]).toBe(
      "1 unclassified individual kept is left out, as the box Individuals says.",
    );
    expect(unclassifiedLeftOutOf(p, someKept)).toBe(1);
  });

  test("with no individuals file, and with None chosen, the one population, Unclassified, with no line of the unclassified", () => {
    const words =
      "1 population, Unclassified: 10 individuals. No individual is assigned to a population, so the diversity is of every individual kept as one population.";
    for (const p of [projectOf(null), projectOf(ROWS, false)]) {
      const lines = diversityTabReadyLines(p, keptOf(null));
      expect(lines[0]).toBe(words);
      expect(lines.join(" ")).not.toContain("unclassified individual");
      expect(unclassifiedLeftOutOf(p, keptOf(null))).toBe(0);
    }
  });

  test("the populations under the minimum, and those the thresholds empty, in the words of the Variants tab", () => {
    const p = projectOf(ROWS);
    const lines = diversityTabReadyLines(p, keptOf(["s000", "s001", "s008"]));
    expect(lines).toEqual([
      "1 population: A, 2 individuals",
      "1 unclassified individual kept is left out, as the box Individuals says.",
      "A has 2 individuals, fewer than the minimum of 20, so it will have no values.",
      "B has no individual left after the thresholds of the individuals, and is left out. Loosen the thresholds of the individuals in the Variants tab to keep it.",
    ]);
  });

  test("while a threshold of the individuals waits for the one pass, the populations before it, and that it may take individuals from them", () => {
    const p = deepFreeze(
      setIndividualFilter(projectOf(ROWS), {
        kind: "obs_het",
        maxAllowedObsHet: 0.3,
      }),
    );
    const kept: IndividualsKept = {
      list: { kind: "needsStatistics" },
      byLists: INDIVIDUALS,
      counts: [],
    };
    const lines = diversityTabReadyLines(p, kept);
    expect(lines[0]).toBe("2 populations: A, 4 individuals; B, 4 individuals");
    expect(lines.at(-1)).toBe(
      "The thresholds of the individuals may take individuals from them once panel.nei is read to the end.",
    );
  });

  test("no line with no individuals kept known", () => {
    expect(diversityTabReadyLines(projectOf(ROWS), null)).toEqual([]);
  });

  test("the locks of the one pass name the diversity; none once the pass is done", () => {
    const p = projectOf(null);
    expect(diversityTabLock(p, "reading")).toBe(
      "Run once panel.nei is read to the end: the reading under way in the box Variants and the diversity cannot run at once.",
    );
    expect(diversityTabLock(p, "stopped")).toBe(
      "Run once panel.nei is read to the end: Start again its reading in the box Variants.",
    );
    expect(diversityTabLock(p, "unreadable")).toBe(
      "Run once panel.nei is read to the end: it could not be read, as the box Variants says. Open it again there, or open another.",
    );
    expect(diversityTabLock(p, null)).toBeNull();
  });

  test("the line of a Stop, the caption's sentence of the unclassified, and the result that could not be loaded", () => {
    expect(DIVERSITY_STOPPED_LINE).toBe(
      "Stopped: the diversity no longer starts by itself after a change. Run calculates it and starts it again after each change.",
    );
    expect(DIVERSITY_AFTER_CRASH_LINE).toBe(
      "The diversity starts again after the next change of the filters, of its options or of the populations.",
    );
    expect(DIVERSITY_FAILURE_ENDED_LINE).toBe(
      "The diversity no longer starts by itself after a change, since its calculation failed. Run calculates it and starts it again after each change.",
    );
    expect(unclassifiedCaption(7)).toBe(
      "7 unclassified individuals kept are not in it.",
    );
    expect(unclassifiedCaption(1)).toBe(
      "1 unclassified individual kept is not in it.",
    );
    expect(POPULATIONS_TAB_LOADING).toBe("Loading the Populations tab…");
    expect(populationsTabFailed("panel.nei")).toBe(
      "The Populations tab could not be loaded. Press Try again. If it fails again, the site may have been updated since this page was opened: reload the page and open panel.nei again; what the page has calculated is lost.",
    );
  });
});

describe("PT2 D1 the lines of the Populations tab while the diversity is live and does not run", () => {
  test("the quiet second, or a change under way, with no live analysis before it about to start", () => {
    expect(diversityWaitingLine("changes", null)).toBe(
      "The diversity starts again in a moment, once the filters and its options stop changing.",
    );
  });

  test("the quiet second with the PCA live and about to start before it, by the method", () => {
    expect(diversityWaitingLine("changes", "the PCA")).toBe(
      "The diversity starts after the PCA, once the filters and the options stop changing.",
    );
    expect(diversityWaitingLine("changes", "the PCoA")).toBe(
      "The diversity starts after the PCoA, once the filters and the options stop changing.",
    );
  });

  test("waiting for the PCA that runs, by the method", () => {
    expect(diversityWaitingLine("behind", "the PCA")).toBe(
      "The diversity starts once the PCA, which is running, ends.",
    );
    expect(diversityWaitingLine("behind", "the PCoA")).toBe(
      "The diversity starts once the PCoA, which is running, ends.",
    );
  });

  test("the dialog of the download or its write, also with the PCA about to start before it", () => {
    const line =
      "The diversity starts again when the download is written or closed.";
    expect(diversityWaitingLine("download", null)).toBe(line);
    expect(diversityWaitingLine("download", "the PCA")).toBe(line);
  });

  test("after a crash ended another live state, the next change", () => {
    expect(diversityWaitingLine("afterCrash", null)).toBe(
      DIVERSITY_AFTER_CRASH_LINE,
    );
  });

  test("each live state as the panel draws it: the line of a Stop, of a failure that ended it, none with nothing to wait for, and the line of what it waits for", () => {
    expect(diversityPanelLive({ kind: "off" }, null)).toEqual({ kind: "off" });
    expect(diversityPanelLive({ kind: "stopped" }, null)).toEqual({
      kind: "stopped",
      line: DIVERSITY_STOPPED_LINE,
    });
    expect(diversityPanelLive({ kind: "endedByFailure" }, null)).toEqual({
      kind: "stopped",
      line: DIVERSITY_FAILURE_ENDED_LINE,
    });
    expect(
      diversityPanelLive(
        { kind: "live", aboutToStart: null, running: false, after: null },
        null,
      ),
    ).toEqual({ kind: "live", aboutToStartLine: null });
    expect(
      diversityPanelLive(
        { kind: "live", aboutToStart: "behind", running: false, after: "pca" },
        "the PCA",
      ),
    ).toEqual({
      kind: "live",
      aboutToStartLine:
        "The diversity starts once the PCA, which is running, ends.",
    });
    expect(
      diversityPanelLive(
        {
          kind: "live",
          aboutToStart: "changes",
          running: false,
          after: "pca",
        },
        "the PCA",
      ),
    ).toEqual({
      kind: "live",
      aboutToStartLine:
        "The diversity starts after the PCA, once the filters and the options stop changing.",
    });
  });
});
